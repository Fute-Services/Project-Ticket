const { db } = require('../config/firebase');
const { sendMail, newComplaintEmail, statusUpdateEmail } = require('../utils/mailer');
const { STATUSES, generateToken, pageSize, fetchPage } = require('../utils/complaints');
require('dotenv').config();

const collection = db.collection('it_complaints');

// IT staff and the founder may read any IT complaint; everyone else only their own
function canReadAll(user) {
  return user.role === 'it' || user.role === 'founder';
}

// POST /api/it/complaints
async function createComplaint(req, res) {
  const { category, sub_category, description, complaint_date, priority, approval } = req.body;
  // Name and department come from the signed-in user, not from the form
  const name = req.user.full_name;
  const department = req.body.department || req.user.department;

  if (!name || !department || !category || !sub_category || !description || !complaint_date || !priority) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const token = generateToken('IT');
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
    submitted_at,
    priority,
    approval: approval === true || approval === 'true',
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

// GET /api/it/complaints?limit=&cursor= — IT staff / founder
async function getAllComplaints(req, res) {
  const page = await fetchPage(collection, {
    limit: pageSize(req),
    cursor: req.query.cursor,
  });
  res.json(page);
}

// GET /api/it/complaints/my?limit=&cursor=
async function getMyComplaints(req, res) {
  const page = await fetchPage(collection.where('user_id', '==', req.user.id), {
    limit: pageSize(req),
    cursor: req.query.cursor,
  });
  res.json(page);
}

// GET /api/it/complaints/search?token=
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

// PATCH /api/it/complaints/:id/status
async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const docRef = collection.doc(id);
  const updated_at = new Date().toISOString();
  await docRef.update({ status, updated_at });
  const data = { id, ...(await docRef.get()).data() };

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
