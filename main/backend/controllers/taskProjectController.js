const { db } = require('../config/firebase');

const tasksCollection = db.collection('tasks');
const projectsCollection = db.collection('projects');

// GET /api/coordinator/projects — read across Coordinator, Founder, and
// Employee "My Projects" views, so no role restriction.
async function getProjects(req, res) {
  const snap = await projectsCollection.limit(200).get();
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

// GET /api/coordinator/tasks — same broad read access as projects.
async function getTasks(req, res) {
  const snap = await tasksCollection.limit(200).get();
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

// POST /api/coordinator/tasks — coordinator/founder assign a new task.
async function createTask(req, res) {
  const { projectId, title, assignee } = req.body;
  if (!projectId || !title || !assignee) {
    return res.status(400).json({ error: 'projectId, title and assignee are required' });
  }

  const docData = {
    projectId,
    title,
    assignee,
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
  res.status(201).json({ id: docRef.id, ...docData });
}

// PATCH /api/coordinator/tasks/:id/status — open to any logged-in user so
// the assigned employee can toggle their own task complete/incomplete, and
// the coordinator can drag-move tasks across the board — but only *that*
// task's own assignee (tasks store `assignee` as the employee's full name,
// see createTask above) or a coordinator/founder, never an arbitrary other
// employee guessing/enumerating task ids from the open GET /tasks list.
async function updateTaskStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status is required' });

  const docRef = tasksCollection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ error: 'Task not found' });

  const isOwnerOrManager =
    req.user.role === 'coordinator' ||
    req.user.role === 'founder' ||
    doc.data().assignee === req.user.full_name;
  if (!isOwnerOrManager) return res.status(403).json({ error: 'Access denied' });

  const updated_at = new Date().toISOString();
  await docRef.update({ status, updated_at });
  res.json({ id, ...doc.data(), status, updated_at });
}

const EDITABLE_FIELDS = ['title', 'assignee', 'priority', 'dueDate', 'duration', 'comments', 'attachments', 'figma', 'pr'];

// PATCH /api/coordinator/tasks/:id — coordinator/founder edit any field
// (the task detail pane's general editor).
async function updateTask(req, res) {
  const { id } = req.params;
  const updates = {};
  for (const key of EDITABLE_FIELDS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (req.body.status !== undefined) updates.status = req.body.status;
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No editable fields provided' });

  const docRef = tasksCollection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ error: 'Task not found' });

  updates.updated_at = new Date().toISOString();
  await docRef.update(updates);
  res.json({ id, ...doc.data(), ...updates });
}

module.exports = { getProjects, getTasks, createTask, updateTaskStatus, updateTask };
