const { db } = require('../config/firebase');
const { sendMail, newComplaintEmail, statusUpdateEmail } = require('../utils/mailer');
require('dotenv').config();

const collection = db.collection('it_complaints');

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return `FT-IT-${result}`;
}

function calcDuration(complaintDate) {
  const diff = Date.now() - new Date(complaintDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} minute(s)`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour(s)`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day(s)`;
  return `${Math.floor(days / 7)} week(s)`;
}

function sortByRecent(docs) {
  return docs.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
}

// POST /api/it/complaints
async function createComplaint(req, res) {
  const {
    name, department, category, sub_category, description, complaint_date, priority, approval,
    employeeId, vpnNo,
  } = req.body;
  if (!name || !department || !category || !sub_category || !description || !complaint_date || !priority) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const token = generateToken();
  const duration = calcDuration(complaint_date);
  const submitted_at = new Date().toISOString();

  const docData = {
    token,
    user_id: req.user.id,
    name,
    department,
    category,
    sub_category,
    description,
    complaint_date,
    duration,
    submitted_at,
    priority,
    approval: approval === true || approval === 'true',
    employeeId: employeeId || '',
    vpnNo: vpnNo || '',
    employeeStatus: '',
    solver: '',
    remarks: '',
    status: 'Pending',
    updated_at: submitted_at,
  };

  const docRef = await collection.add(docData);
  const data = { id: docRef.id, ...docData };

  try {
    await sendMail(
      process.env.IT_EMAIL,
      `New IT Complaint — ${token}`,
      newComplaintEmail(token, name, department, priority)
    );
  } catch (e) {
    console.error('Mail error:', e.message);
  }

  res.status(201).json({ complaint: data, token });
}

// GET /api/it/complaints — IT staff / founder
async function getAllComplaints(req, res) {
  const snap = await collection.get();
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json(sortByRecent(data));
}

// GET /api/it/complaints/my
async function getMyComplaints(req, res) {
  const snap = await collection.where('user_id', '==', req.user.id).get();
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json(sortByRecent(data));
}

// GET /api/it/complaints/search?token=
async function searchByToken(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token query param required' });
  const snap = await collection.where('token', '==', token.toUpperCase()).limit(1).get();
  if (snap.empty) return res.status(404).json({ error: 'Complaint not found' });
  const doc = snap.docs[0];
  res.json({ id: doc.id, ...doc.data() });
}

const VALID_STATUSES = ['Pending', 'In Progress', 'Waiting Approval', 'Completed'];

// PATCH /api/it/complaints/:id/status
async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const docRef = collection.doc(id);
  const before = await docRef.get();
  if (!before.exists) return res.status(404).json({ error: 'Complaint not found' });
  const previousStatus = before.data().status;

  const updated_at = new Date().toISOString();
  await docRef.update({ status, updated_at });
  const data = { id, ...(await docRef.get()).data() };

  // Waiting Approval hands the ticket off to the founder — create the
  // approval record here rather than making the frontend do a second call,
  // so the two states can never go out of sync.
  if (status === 'Waiting Approval') {
    await db.collection('approvals').add({
      source: 'IT',
      title: `${data.category} — ${data.sub_category}`,
      sub: data.description,
      requestedBy: data.name,
      priority: data.priority,
      category: data.category,
      status: 'pending_founder',
      complaintRef: { collection: 'it_complaints', id },
      previousStatus,
      createdAt: new Date().toISOString(),
    });
  }

  try {
    const submitterDoc = await db.collection('users').doc(data.user_id).get();
    if (submitterDoc.exists) {
      const submitter = submitterDoc.data();
      await sendMail(
        submitter.email,
        `Your Complaint ${data.token} has been updated`,
        statusUpdateEmail(data.token, status, req.user.full_name)
      );
    }
  } catch (e) {
    console.error('Mail error:', e.message);
  }

  res.json(data);
}

// PATCH /api/it/complaints/:id/fields — IT desk editable columns that aren't
// the workflow `status` (employeeStatus, solver, remarks, vpnNo, employeeId).
const EDITABLE_FIELDS = ['employeeStatus', 'solver', 'remarks', 'vpnNo', 'employeeId'];

async function updateFields(req, res) {
  const { id } = req.params;
  const updates = {};
  for (const key of EDITABLE_FIELDS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: `No editable fields provided (allowed: ${EDITABLE_FIELDS.join(', ')})` });
  }

  const docRef = collection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ error: 'Complaint not found' });

  updates.updated_at = new Date().toISOString();
  await docRef.update(updates);
  res.json({ id, ...(await docRef.get()).data() });
}

module.exports = { createComplaint, getAllComplaints, getMyComplaints, searchByToken, updateStatus, updateFields };
