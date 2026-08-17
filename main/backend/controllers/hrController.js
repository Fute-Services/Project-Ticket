const { db } = require('../config/firebase');
const { sendMail, newComplaintEmail, statusUpdateEmail } = require('../utils/mailer');
require('dotenv').config();

const collection = db.collection('hr_complaints');

// Generate token: FT-HR-XXXXXX
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return `FT-HR-${result}`;
}

// Calculate duration string from complaint_date to now
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

// POST /api/hr/complaints — submit new HR complaint
async function createComplaint(req, res) {
  const { name, role, department, description, complaint_date, priority, employeeId } = req.body;
  if (!name || !department || !description || !complaint_date || !priority) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const token = generateToken();
  const duration = calcDuration(complaint_date);
  const submitted_at = new Date().toISOString();

  let resolvedEmployeeId = employeeId || '';
  let dbUserRole = '';
  if (req.user?.id) {
    try {
      const userDoc = await db.collection('users').doc(req.user.id).get();
      if (userDoc.exists) {
        const uData = userDoc.data();
        if (!resolvedEmployeeId) resolvedEmployeeId = uData.employee_id || uData.employeeId || '';
        dbUserRole = uData.department || uData.designation || uData.role || '';
      }
    } catch (e) {
      console.error('Failed to lookup user employee_id:', e.message);
    }
  }

  const rawRole = role || dbUserRole || req.user?.role || 'employee';
  const formattedRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);

  const docData = {
    token,
    user_id: req.user.id,
    user_role: formattedRole,
    role: formattedRole,
    name,
    department: department || formattedRole || 'General',
    description,
    complaint_date,
    duration,
    submitted_at,
    priority,
    employeeId: resolvedEmployeeId,
    employeeStatus: 'Active',
    solver: 'Team 1',
    remarks: '',
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

// Tickets store `role`/`user_role` at creation time, so most docs need no
// lookup here at all; only legacy docs missing both fields fall back to a
// bounded, deduped single-doc read instead of scanning the whole users
// collection on every list request.
async function enrichWithUserRole(docs) {
  try {
    const needsLookup = docs.filter((d) => !d.role && !d.user_role);
    const userMap = {};
    if (needsLookup.length > 0) {
      const uniqueUserIds = [...new Set(needsLookup.map((d) => d.user_id).filter(Boolean))];
      await Promise.all(
        uniqueUserIds.map(async (uid) => {
          const doc = await db.collection('users').doc(uid).get();
          if (doc.exists) userMap[uid] = doc.data();
        })
      );
    }

    return docs.map((d) => {
      if (d.role && d.user_role) return d;
      const u = userMap[d.user_id] || {};
      const resolvedRole =
        d.role ||
        u.department ||
        u.designation ||
        (u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : null) ||
        d.user_role ||
        d.department ||
        'Employee';
      const formattedRole = resolvedRole.charAt(0).toUpperCase() + resolvedRole.slice(1);
      return {
        ...d,
        role: formattedRole,
        user_role: formattedRole,
      };
    });
  } catch (e) {
    return docs;
  }
}

// GET /api/hr/complaints — HR staff / founder sees all
async function getAllComplaints(req, res) {
  const snap = await collection.get();
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const enriched = await enrichWithUserRole(data);
  res.json(sortByRecent(enriched));
}

// GET /api/hr/complaints/my — employee sees own complaints
async function getMyComplaints(req, res) {
  const snap = await collection.where('user_id', '==', req.user.id).get();
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const enriched = await enrichWithUserRole(data);
  res.json(sortByRecent(enriched));
}

// GET /api/hr/complaints/search?token=FT-HR-XXXXX
async function searchByToken(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token query param required' });
  const snap = await collection.where('token', '==', token.toUpperCase()).limit(1).get();
  if (snap.empty) return res.status(404).json({ error: 'Complaint not found' });
  const doc = snap.docs[0];
  res.json({ id: doc.id, ...doc.data() });
}

const VALID_STATUSES = ['Pending', 'In Progress', 'Waiting Approval', 'Completed'];

// PATCH /api/hr/complaints/:id/status — HR staff / founder updates status
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
  const data = { id, ...before.data(), status, updated_at };

  if (status === 'Waiting Approval') {
    await db.collection('approvals').add({
      source: 'HR',
      title: `HR Request — ${data.name}`,
      sub: data.description,
      requestedBy: data.name,
      priority: data.priority,
      category: 'HR',
      status: 'pending_founder',
      complaintRef: { collection: 'hr_complaints', id },
      previousStatus,
      createdAt: new Date().toISOString(),
    });
  }

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

// PATCH /api/hr/complaints/:id/fields — editable columns outside `status`.
const EDITABLE_FIELDS = ['employeeStatus', 'solver', 'remarks', 'employeeId'];

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

  const docData = doc.data();
  const isOwner = docData.user_id === req.user?.id;
  const isStaff = ['hr', 'founder', 'superadmin'].includes(req.user?.role);
  if (!isOwner && !isStaff) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  }

  updates.updated_at = new Date().toISOString();
  await docRef.update(updates);
  res.json({ id, ...docData, ...updates });
}

module.exports = { createComplaint, getAllComplaints, getMyComplaints, searchByToken, updateStatus, updateFields };
