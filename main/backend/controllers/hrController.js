const { db } = require('../config/firebase');
const { sendMail, newComplaintEmail, statusUpdateEmail } = require('../utils/mailer');
const { STATUSES, generateToken, pageSize, fetchPage } = require('../utils/complaints');
require('dotenv').config();

const collection = db.collection('hr_complaints');

// HR staff and the founder may read any HR complaint; everyone else only their own
function canReadAll(user) {
  return user.role === 'hr' || user.role === 'founder';
}

// POST /api/hr/complaints — submit new HR complaint
async function createComplaint(req, res) {
  const { description, complaint_date, priority } = req.body;
  // Name and department come from the signed-in user, not from the form
  const name = req.user.full_name;
  const department = req.body.department || req.user.department;

  if (!name || !department || !description || !complaint_date || !priority) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const token = generateToken('HR');
  const submitted_at = new Date().toISOString();

  const docData = {
    token,
    user_id: req.user.id,
    name,
    department,
    description,
    complaint_date,
    submitted_at,
    priority,
    status: 'Pending',
    updated_at: submitted_at,
  };

  const docRef = await collection.add(docData);
  const data = { id: docRef.id, ...docData };

  // Notify HR staff
  try {
    await sendMail(
      process.env.HR_EMAIL,
      `New HR Complaint — ${token}`,
      newComplaintEmail(token, name, department, priority)
    );
  } catch (e) {
    console.error('Mail error:', e.message);
  }

  res.status(201).json({ complaint: data, token });
}

// GET /api/hr/complaints?limit=&cursor= — HR staff / founder sees all
async function getAllComplaints(req, res) {
  const page = await fetchPage(collection, {
    limit: pageSize(req),
    cursor: req.query.cursor,
  });
  res.json(page);
}

// GET /api/hr/complaints/my?limit=&cursor= — employee sees own complaints
async function getMyComplaints(req, res) {
  const page = await fetchPage(collection.where('user_id', '==', req.user.id), {
    limit: pageSize(req),
    cursor: req.query.cursor,
  });
  res.json(page);
}

// GET /api/hr/complaints/search?token=FT-HR-XXXXX
async function searchByToken(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token query param required' });

  const snap = await collection.where('token', '==', token.toUpperCase()).limit(1).get();
  if (snap.empty) return res.status(404).json({ error: 'Complaint not found' });

  const doc = snap.docs[0];
  const data = { id: doc.id, ...doc.data() };

  // An employee may only open their own ticket. Answer 404 rather than 403 so a
  // stranger's token cannot be confirmed to exist.
  if (!canReadAll(req.user) && data.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  res.json(data);
}

// PATCH /api/hr/complaints/:id/status — HR staff / founder updates status
async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const docRef = collection.doc(id);
  const updated_at = new Date().toISOString();
  await docRef.update({ status, updated_at });
  const data = { id, ...(await docRef.get()).data() };

  // Notify the employee who submitted
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

module.exports = { createComplaint, getAllComplaints, getMyComplaints, searchByToken, updateStatus };
