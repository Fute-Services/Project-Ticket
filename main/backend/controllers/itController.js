const { db } = require('../config/firebase');
const { sendMail, newComplaintEmail, statusUpdateEmail } = require('../utils/mailer');
const { loadNotificationRules } = require('../utils/notificationRules');
const { paginatedQuery } = require('../utils/pagination');
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
  return docs.sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));
}

// POST /api/it/complaints
async function createComplaint(req, res) {
  const {
    name, role, department, category, sub_category, description, complaint_date, priority, approval,
    employeeId, vpnNo,
  } = req.body;
  if (!name || !department || !category || !sub_category || !description || !complaint_date || !priority) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const token = generateToken();
  const duration = calcDuration(complaint_date);
  const submitted_at = new Date().toISOString();

  let resolvedEmployeeId = employeeId || '';
  let resolvedDepartment = department || '';
  let dbUserRole = '';
  if (req.user?.id) {
    try {
      const userDoc = await db.collection('users').doc(req.user.id).get();
      if (userDoc.exists) {
        const uData = userDoc.data();
        if (!resolvedEmployeeId) resolvedEmployeeId = uData.employee_id || uData.employeeId || '';
        if (!resolvedDepartment || resolvedDepartment === 'General') resolvedDepartment = uData.department || uData.designation || '';
        dbUserRole = uData.department || uData.designation || uData.role || '';
      }
    } catch (e) {
      console.error('Failed to lookup user data:', e.message);
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
    department: resolvedDepartment || department || formattedRole || 'General',
    category,
    sub_category,
    description,
    complaint_date,
    duration,
    submitted_at,
    priority,
    approval: approval === true || approval === 'true',
    employeeId: resolvedEmployeeId,
    vpnNo: vpnNo || '',
    employeeStatus: 'Active',
    solver: 'Team 1',
    remarks: '',
    status: 'Pending',
    updated_at: submitted_at,
  };

  const docRef = await collection.add(docData);
  const data = { id: docRef.id, ...docData };

  try {
    const rules = await loadNotificationRules();
    if (rules.it_new_complaint.enabled) {
      await sendMail(
        rules.it_new_complaint.recipientEmail || process.env.IT_EMAIL,
        `New IT Complaint — ${token}`,
        newComplaintEmail(token, name, department, priority)
      );
    }
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

// GET /api/it/complaints?after=<cursor> — IT staff / founder, 20 at a time.
async function getAllComplaints(req, res) {
  const { docs, nextCursor } = await paginatedQuery(collection, 'submitted_at', req.query.after);
  const data = docs.map(d => ({ id: d.id, ...d.data() }));
  const enriched = await enrichWithUserRole(data);
  res.json({ items: sortByRecent(enriched), nextCursor });
}

// GET /api/it/complaints/my — no `.orderBy('submitted_at')` on the query
// itself, see sortByRecent() above: Firestore silently drops any document
// missing the ordered field from the result set entirely.
async function getMyComplaints(req, res) {
  const snap = await collection.where('user_id', '==', req.user.id).limit(200).get();
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const enriched = await enrichWithUserRole(data);
  res.json(sortByRecent(enriched));
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
  const updated_at = new Date().toISOString();

  // Waiting Approval hands the ticket off to the founder — the ticket
  // update and its approval record are written in one transaction, so a
  // failure between the two writes can no longer leave the ticket stuck
  // showing "Waiting Approval" with no approval record for the founder to
  // ever act on (the two used to be independent, sequential writes).
  const approvalRef = db.collection('approvals').doc();
  await db.runTransaction(async (tx) => {
    const before = await tx.get(docRef);
    if (!before.exists) throw Object.assign(new Error('Complaint not found'), { status: 404 });
    const previousStatus = before.data().status;

    tx.update(docRef, { status, updated_at });

    // Only create an approval record on the transition INTO "Waiting
    // Approval" — without the previousStatus check, re-sending the same
    // status (e.g. a UI double-click before the approvals list has
    // refreshed) created a fresh duplicate approvals/{id} every time.
    if (status === 'Waiting Approval' && previousStatus !== 'Waiting Approval') {
      const data = before.data();
      tx.set(approvalRef, {
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
  }).catch((err) => {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  });
  if (res.headersSent) return;

  const data = { id, ...(await docRef.get()).data() };

  try {
    const rules = await loadNotificationRules();
    if (rules.it_status_update.enabled) {
      const submitterDoc = await db.collection('users').doc(data.user_id).get();
      if (submitterDoc.exists) {
        const submitter = submitterDoc.data();
        await sendMail(
          submitter.email,
          `Your Complaint ${data.token} has been updated`,
          statusUpdateEmail(data.token, status, req.user.full_name)
        );
      }
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

  const docData = doc.data();
  const isOwner = docData.user_id === req.user?.id;
  const isStaff = ['it', 'founder', 'superadmin'].includes(req.user?.role);
  if (!isOwner && !isStaff) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  }

  updates.updated_at = new Date().toISOString();
  await docRef.update(updates);
  res.json({ id, ...docData, ...updates });
}

module.exports = { createComplaint, getAllComplaints, getMyComplaints, searchByToken, updateStatus, updateFields };
