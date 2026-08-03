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
  const { name, department, category, sub_category, description, complaint_date, priority, approval } = req.body;
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

// PATCH /api/it/complaints/:id/status
async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['Pending', 'In Progress', 'Completed'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

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
