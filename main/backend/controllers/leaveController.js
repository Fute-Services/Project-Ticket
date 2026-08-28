const { db } = require('../config/firebase');
const { UNPAGINATED_READ_LIMIT } = require('../utils/constants');
const { paginatedQuery } = require('../utils/pagination');

const collection = db.collection('leave_requests');

// HR doesn't approve its own department's time off — a request from Admin/Ops
// or IT routes to the Founder instead. Mirrors isFounderApproval() in the
// frontend's LeaveContext.jsx, now driven by the requester's real profile
// department instead of a mock employee lookup.
function isFounderApproval(department) {
  return department === 'Admin/Ops' || department === 'IT';
}

function sortByRecent(docs) {
  return docs.sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));
}

// POST /api/leave — any logged-in employee applies for their own leave
async function applyLeave(req, res) {
  const { type, from, to, days, reason } = req.body;
  if (!type || !from || !to || !days) {
    return res.status(400).json({ error: 'type, from, to and days are required' });
  }

  const userDoc = await db.collection('users').doc(req.user.id).get();
  const department = userDoc.exists ? userDoc.data().department : null;

  const docData = {
    user_id: req.user.id,
    employee: req.user.full_name,
    department: department || 'General',
    type,
    from,
    to,
    days,
    reason: reason || '',
    status: 'Pending',
    submitted_at: new Date().toISOString(),
  };

  const docRef = await collection.add(docData);
  res.status(201).json({ id: docRef.id, ...docData });
}

// GET /api/leave?after=<cursor> — HR staff / founder see every request, 20
// at a time (was a full-collection re-read every poll — see paginatedQuery).
async function getAllLeaves(req, res) {
  const { docs, nextCursor } = await paginatedQuery(collection, 'submitted_at', req.query.after);
  const data = docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({ items: sortByRecent(data), nextCursor });
}

// GET /api/leave/my — an employee's own leave history
async function getMyLeaves(req, res) {
  const snap = await collection.where('user_id', '==', req.user.id).limit(UNPAGINATED_READ_LIMIT).get();
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(sortByRecent(data));
}

const DECISIONS = ['Approved', 'Rejected'];

// PATCH /api/leave/:id/decide
async function decide(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!DECISIONS.includes(status)) return res.status(400).json({ error: 'status must be Approved or Rejected' });

  const docRef = collection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ error: 'Leave request not found' });
  const leave = doc.data();

  // Admin/Ops and IT leave is the Founder's call — HR can't decide those,
  // same routing rule the frontend used to apply client-side.
  if (isFounderApproval(leave.department) && req.user.role !== 'founder') {
    return res.status(403).json({ error: 'Only the founder can decide leave for this department' });
  }

  const updated_at = new Date().toISOString();
  const decidedBy = req.user.full_name;
  await docRef.update({ status, updated_at, decidedBy });
  res.json({ id, ...leave, status, updated_at, decidedBy });
}

module.exports = { applyLeave, getAllLeaves, getMyLeaves, decide };
