const { db } = require('../config/db');
const { UNPAGINATED_READ_LIMIT } = require('../utils/constants');
const { paginatedQuery } = require('../utils/pagination');
const { ok, created, fail } = require('../utils/respond');

const tasksCollection = db.collection('tasks');
const projectsCollection = db.collection('projects');
const usersCollection = db.collection('users');

// GET /api/coordinator/projects — Coordinator/Founder see every project;
// an Employee only sees projects they're tagged on (memberIds contains
// their id), enforced here rather than left to the client to filter — the
// same server-side-scoping fix already applied to getTasks below.
async function getProjects(req, res) {
  // `created_at` is guaranteed on every doc created via createProject below,
  // but older hand-seeded docs may still lack it — orderBy() would silently
  // drop those, so still left unordered.
  const snap = await projectsCollection.limit(UNPAGINATED_READ_LIMIT).get();
  let projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (req.user.role === 'employee') {
    projects = projects.filter((p) => Array.isArray(p.memberIds) && p.memberIds.includes(req.user.id));
  }
  ok(res, projects);
}

// Shared by createProject/updateProject — every id in `memberIds` must be a
// real, active employee account, same rule createTask already applies to
// assigneeId. Returns the resolved list of {id, full_name} on success, or
// null (and has already sent the error response) on failure.
async function resolveMemberIds(memberIds, res) {
  if (!Array.isArray(memberIds)) {
    fail(res, { status: 400, message: 'memberIds must be an array', code: 'VALIDATION_ERROR' });
    return null;
  }
  const uniqueIds = [...new Set(memberIds)];
  const docs = await Promise.all(uniqueIds.map((id) => usersCollection.doc(id).get()));
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    if (!d.exists || d.data().role !== 'employee' || d.data().active === false) {
      fail(res, { status: 400, message: `memberIds contains an invalid or inactive employee id: ${uniqueIds[i]}`, code: 'VALIDATION_ERROR' });
      return null;
    }
  }
  return uniqueIds;
}

// POST /api/coordinator/projects — coordinator/founder create a project and
// tag its team by real employee id (memberIds), not display name — so
// employee-side "My Projects" (getProjects above) can filter server-side
// instead of trusting a client-side name match.
async function createProject(req, res) {
  const { name, client, dueDate } = req.body;
  if (!name || !client || !dueDate) {
    return fail(res, { status: 400, message: 'name, client and dueDate are required', code: 'VALIDATION_ERROR' });
  }

  const memberIds = await resolveMemberIds(req.body.memberIds || [], res);
  if (memberIds === null) return; // resolveMemberIds already sent the error response

  const docData = {
    name,
    client,
    startDate: req.body.startDate || '',
    dueDate,
    status: req.body.status || 'On Track',
    progress: Number.isFinite(req.body.progress) ? req.body.progress : 0,
    figma: req.body.figma || '',
    repo: req.body.repo || '',
    memberIds,
    created_at: new Date().toISOString(),
  };

  const docRef = await projectsCollection.add(docData);
  created(res, { id: docRef.id, ...docData }, 'Project created successfully');
}

const PROJECT_EDITABLE_FIELDS = ['name', 'client', 'startDate', 'dueDate', 'status', 'figma', 'repo'];

// PATCH /api/coordinator/projects/:id — coordinator/founder edit project
// fields and/or the tagged team (memberIds).
async function updateProject(req, res) {
  const { id } = req.params;
  const updates = {};
  for (const key of PROJECT_EDITABLE_FIELDS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  // Handled separately from the plain-copy loop above so a non-numeric value
  // can't silently overwrite the progress bar's expected type — createProject
  // already guards against this the same way.
  if (req.body.progress !== undefined) {
    if (!Number.isFinite(req.body.progress)) {
      return fail(res, { status: 400, message: 'progress must be a number', code: 'VALIDATION_ERROR' });
    }
    updates.progress = req.body.progress;
  }

  if (req.body.memberIds !== undefined) {
    const memberIds = await resolveMemberIds(req.body.memberIds, res);
    if (memberIds === null) return;
    updates.memberIds = memberIds;
  }

  if (Object.keys(updates).length === 0) return fail(res, { status: 400, message: 'No editable fields provided', code: 'VALIDATION_ERROR' });

  const docRef = projectsCollection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return fail(res, { status: 404, message: 'Project not found', code: 'NOT_FOUND' });

  updates.updated_at = new Date().toISOString();
  await docRef.update(updates);
  ok(res, { id, ...doc.data(), ...updates }, { message: 'Project updated successfully' });
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

  // A task can only go to someone actually tagged on its project — otherwise
  // an employee could end up with a task under a project they aren't a
  // member of, and can't see the rest of the project's team/board.
  const projectDoc = await projectsCollection.doc(projectId).get();
  if (!projectDoc.exists) {
    return fail(res, { status: 400, message: 'projectId does not exist', code: 'VALIDATION_ERROR' });
  }
  if (!(projectDoc.data().memberIds || []).includes(assigneeId)) {
    return fail(res, { status: 400, message: 'assigneeId must be tagged as a member of this project', code: 'VALIDATION_ERROR' });
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

  const docRef = tasksCollection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return fail(res, { status: 404, message: 'Task not found', code: 'NOT_FOUND' });

  if (req.body.assigneeId !== undefined) {
    const assigneeDoc = await usersCollection.doc(req.body.assigneeId).get();
    if (!assigneeDoc.exists || assigneeDoc.data().role !== 'employee' || assigneeDoc.data().active === false) {
      return fail(res, { status: 400, message: 'assigneeId must be an active employee account', code: 'VALIDATION_ERROR' });
    }
    // Reassignment stays within the task's own project's tagged team — same
    // rule createTask applies up front.
    const projectDoc = await projectsCollection.doc(doc.data().projectId).get();
    if (!projectDoc.exists || !(projectDoc.data().memberIds || []).includes(req.body.assigneeId)) {
      return fail(res, { status: 400, message: 'assigneeId must be tagged as a member of this task\'s project', code: 'VALIDATION_ERROR' });
    }
    updates.assigneeId = req.body.assigneeId;
    updates.assignee = assigneeDoc.data().full_name;
  }

  if (Object.keys(updates).length === 0) return fail(res, { status: 400, message: 'No editable fields provided', code: 'VALIDATION_ERROR' });

  updates.updated_at = new Date().toISOString();
  await docRef.update(updates);
  ok(res, { id, ...doc.data(), ...updates }, { message: 'Task updated successfully' });
}

module.exports = { getProjects, createProject, updateProject, getTasks, createTask, updateTaskStatus, updateTask };
