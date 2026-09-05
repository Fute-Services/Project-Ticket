const { db } = require('../config/db');
const { UNPAGINATED_READ_LIMIT } = require('../utils/constants');
const { paginatedQuery } = require('../utils/pagination');
const { ok, created, fail } = require('../utils/respond');

const tasksCollection = db.collection('tasks');
const projectsCollection = db.collection('projects');
const usersCollection = db.collection('users');

// GET /api/coordinator/projects — read across Coordinator, Founder, and
// Employee "My Projects" views, so no role restriction.
async function getProjects(req, res) {
  // No writer for this collection exists in the backend (seeded directly in
  // Firestore), so a `created_at` field isn't guaranteed on every doc —
  // orderBy() would silently drop any doc missing it, which is worse than
  // the current arbitrary-200 issue. Left unordered until projects gain a
  // real create path with a guaranteed timestamp field.
  const snap = await projectsCollection.limit(UNPAGINATED_READ_LIMIT).get();
  ok(res, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

// GET /api/coordinator/tasks?after=<cursor> — Coordinator/Founder get the
// full team-wide board (they need to see everyone's tasks to assign/manage
// them); an Employee only ever gets their own. Matched by `assigneeId` (the
// real, unique user id) rather than `assignee` (a display name) — two
// employees who happen to share a full name used to also share every task
// matched to that name, each able to read and complete the other's tasks.
async function getTasks(req, res) {
  const query = req.user.role === 'employee' ? tasksCollection.where('assigneeId', '==', req.user.id) : tasksCollection;
  const { docs, nextCursor } = await paginatedQuery(query, 'created_at', req.query.after);
  ok(res, { items: docs.map((d) => ({ id: d.id, ...d.data() })), nextCursor });
}

// POST /api/coordinator/tasks — coordinator/founder assign a new task.
// Takes `assigneeId` (a real employee-role user id, from
// GET /api/coordinator/employees) rather than trusting a client-supplied
// name — the display name is resolved from that account's own profile so it
// can't drift from who the task is actually assigned to.
async function createTask(req, res) {
  const { projectId, title, assigneeId } = req.body;
  if (!projectId || !title || !assigneeId) {
    return fail(res, { status: 400, message: 'projectId, title and assigneeId are required', code: 'VALIDATION_ERROR' });
  }

  const assigneeDoc = await usersCollection.doc(assigneeId).get();
  if (!assigneeDoc.exists || assigneeDoc.data().role !== 'employee' || assigneeDoc.data().active === false) {
    return fail(res, { status: 400, message: 'assigneeId must be an active employee account', code: 'VALIDATION_ERROR' });
  }

  const docData = {
    projectId,
    title,
    assigneeId,
    assignee: assigneeDoc.data().full_name,
    priority: req.body.priority || 'Medium',
    status: 'Pending',
    dueDate: req.body.dueDate || '',
    duration: req.body.duration || '',
    comments: 0,
    attachments: 0,
    figma: req.body.figma || '',
    pr: req.body.pr || '',
    created_at: new Date().toISOString(),
  };

  const docRef = await tasksCollection.add(docData);
  created(res, { id: docRef.id, ...docData }, 'Task created successfully');
}

// PATCH /api/coordinator/tasks/:id/status — open to any logged-in user so
// the assigned employee can toggle their own task complete/incomplete, and
// the coordinator can drag-move tasks across the board — but only *that*
// task's own assignee (matched by `assigneeId`, the real user id — see
// createTask above) or a coordinator/founder, never an arbitrary other
// employee guessing/enumerating task ids from the open GET /tasks list.
async function updateTaskStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return fail(res, { status: 400, message: 'status is required', code: 'VALIDATION_ERROR' });

  const docRef = tasksCollection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return fail(res, { status: 404, message: 'Task not found', code: 'NOT_FOUND' });

  const isOwnerOrManager =
    req.user.role === 'coordinator' ||
    req.user.role === 'founder' ||
    doc.data().assigneeId === req.user.id;
  if (!isOwnerOrManager) return fail(res, { status: 403, message: 'Access denied', code: 'FORBIDDEN' });

  const updated_at = new Date().toISOString();
  await docRef.update({ status, updated_at });
  ok(res, { id, ...doc.data(), status, updated_at }, { message: 'Task status updated successfully' });
}

const EDITABLE_FIELDS = ['title', 'priority', 'dueDate', 'duration', 'comments', 'attachments', 'figma', 'pr'];

// PATCH /api/coordinator/tasks/:id — coordinator/founder edit any field
// (the task detail pane's general editor). Reassignment goes through
// `assigneeId` specifically (not the bare `assignee` field) so the display
// name always gets re-resolved from the target account's own profile,
// instead of a hand-typed name silently detaching from any real assigneeId.
async function updateTask(req, res) {
  const { id } = req.params;
  const updates = {};
  for (const key of EDITABLE_FIELDS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (req.body.status !== undefined) updates.status = req.body.status;

  if (req.body.assigneeId !== undefined) {
    const assigneeDoc = await usersCollection.doc(req.body.assigneeId).get();
    if (!assigneeDoc.exists || assigneeDoc.data().role !== 'employee' || assigneeDoc.data().active === false) {
      return fail(res, { status: 400, message: 'assigneeId must be an active employee account', code: 'VALIDATION_ERROR' });
    }
    updates.assigneeId = req.body.assigneeId;
    updates.assignee = assigneeDoc.data().full_name;
  }

  if (Object.keys(updates).length === 0) return fail(res, { status: 400, message: 'No editable fields provided', code: 'VALIDATION_ERROR' });

  const docRef = tasksCollection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return fail(res, { status: 404, message: 'Task not found', code: 'NOT_FOUND' });

  updates.updated_at = new Date().toISOString();
  await docRef.update(updates);
  ok(res, { id, ...doc.data(), ...updates }, { message: 'Task updated successfully' });
}

module.exports = { getProjects, getTasks, createTask, updateTaskStatus, updateTask };
