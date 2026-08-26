const { db } = require('../config/firebase');
const { UNPAGINATED_READ_LIMIT } = require('../utils/constants');
const { sendMail, newComplaintEmail, statusUpdateEmail } = require('../utils/mailer');
const { loadNotificationRules } = require('../utils/notificationRules');
const { paginatedQuery } = require('../utils/pagination');
require('dotenv').config();

// hrController.js and itController.js used to be a hand-copied pair —
// create/list/my/search/status/fields/delete, the duration helper, and
// enrichWithUserRole were structurally identical, and had already started
// drifting (IT gained department-resolution/extra fields HR lacked). This
// factory is the one place that logic lives now; `opts` below is where the
// two queues' real differences (token prefix, extra fields, notification
// rule keys, approval-record shape) are declared.
function generateToken(prefix) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return `FT-${prefix}-${result}`;
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

/**
 * opts:
 *  - collectionName: Firestore collection ('hr_complaints' | 'it_complaints')
 *  - tokenPrefix: 'HR' | 'IT'
 *  - requiredFields: extra required body fields beyond the shared ones
 *  - buildDocData(base, body, ctx): returns the queue-specific extra fields
 *      to merge into the created doc (ctx = { resolvedEmployeeId, dbUserRole, req })
 *  - notifyNewComplaintRuleKey, notifyEmailEnvVar: notificationRules key + env fallback for create
 *  - notifyStatusUpdateRuleKey: notificationRules key for status-change email
 *  - buildApprovalRecord(data, previousStatus, id): approvals/{id} doc shape
 *      for the transition into "Waiting Approval"
 *  - editableFields: PATCH .../fields allow-list
 *  - staffRole: role name (besides founder/superadmin) allowed to edit fields
 */
function createComplaintController(opts) {
  const collection = db.collection(opts.collectionName);
  const VALID_STATUSES = ['Pending', 'In Progress', 'Waiting Approval', 'Completed'];

  async function createComplaint(req, res) {
    const { name, role, department, description, complaint_date, priority, employeeId } = req.body;
    if (!name || !department || !description || !complaint_date || !priority) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    for (const field of opts.requiredFields || []) {
      if (!req.body[field]) return res.status(400).json({ error: 'All fields are required' });
    }

    const token = generateToken(opts.tokenPrefix);
    const duration = calcDuration(complaint_date);
    const submitted_at = new Date().toISOString();

    let resolvedEmployeeId = employeeId || '';
    let dbUserRole = '';
    let dbUserData = null;
    if (req.user?.id) {
      try {
        const userDoc = await db.collection('users').doc(req.user.id).get();
        if (userDoc.exists) {
          dbUserData = userDoc.data();
          if (!resolvedEmployeeId) resolvedEmployeeId = dbUserData.employee_id || dbUserData.employeeId || '';
          dbUserRole = dbUserData.department || dbUserData.designation || dbUserData.role || '';
        }
      } catch (e) {
        console.error('Failed to lookup user data:', e.message);
      }
    }

    const rawRole = role || dbUserRole || req.user?.role || 'employee';
    const formattedRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);

    const extra = opts.buildDocData
      ? opts.buildDocData(req.body, { resolvedEmployeeId, dbUserRole, dbUserData, formattedRole })
      : {};

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
      solver: opts.defaultSolver || 'Team 1',
      remarks: '',
      status: 'Pending',
      updated_at: submitted_at,
      ...extra,
    };

    const docRef = await collection.add(docData);
    const data = { id: docRef.id, ...docData };

    try {
      const rules = await loadNotificationRules();
      if (rules[opts.notifyNewComplaintRuleKey].enabled) {
        await sendMail(
          rules[opts.notifyNewComplaintRuleKey].recipientEmail || process.env[opts.notifyEmailEnvVar],
          `New ${opts.tokenPrefix} Complaint — ${token}`,
          newComplaintEmail(token, name, department, priority)
        );
      }
    } catch (e) {
      console.error('Mail error:', e.message);
    }

    res.status(201).json({ complaint: data, token });
  }

  // GET .../complaints?after=<cursor> — staff/founder sees all, 20 at a time.
  async function getAllComplaints(req, res) {
    const { docs, nextCursor } = await paginatedQuery(collection, 'submitted_at', req.query.after);
    const data = docs.map((d) => ({ id: d.id, ...d.data() }));
    const enriched = await enrichWithUserRole(data);
    res.json({ items: sortByRecent(enriched), nextCursor });
  }

  // GET .../complaints/my — employee sees own complaints. No
  // `.orderBy('submitted_at')` on the query itself, see sortByRecent() above:
  // Firestore silently drops any document missing the ordered field from the
  // result set entirely.
  async function getMyComplaints(req, res) {
    const snap = await collection.where('user_id', '==', req.user.id).limit(UNPAGINATED_READ_LIMIT).get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const enriched = await enrichWithUserRole(data);
    res.json(sortByRecent(enriched));
  }

  async function searchByToken(req, res) {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'token query param required' });
    const snap = await collection.where('token', '==', token.toUpperCase()).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Complaint not found' });
    const doc = snap.docs[0];
    res.json({ id: doc.id, ...doc.data() });
  }

  // PATCH .../complaints/:id/status — staff/founder updates status. The
  // ticket update and its approval record are written in one transaction, so
  // a failure between the two writes can't leave the ticket stuck showing
  // "Waiting Approval" with no approval record for the founder to ever act on.
  async function updateStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const docRef = collection.doc(id);
    const updated_at = new Date().toISOString();

    const approvalRef = db.collection('approvals').doc();
    await db
      .runTransaction(async (tx) => {
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
            ...opts.buildApprovalRecord(data, previousStatus, id),
            status: 'pending_founder',
            createdAt: new Date().toISOString(),
          });
        }
      })
      .catch((err) => {
        if (err.status) return res.status(err.status).json({ error: err.message });
        throw err;
      });
    if (res.headersSent) return;

    const data = { id, ...(await docRef.get()).data() };

    try {
      const rules = await loadNotificationRules();
      if (rules[opts.notifyStatusUpdateRuleKey].enabled) {
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

  async function updateFields(req, res) {
    const { id } = req.params;
    const updates = {};
    for (const key of opts.editableFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: `No editable fields provided (allowed: ${opts.editableFields.join(', ')})` });
    }

    const docRef = collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Complaint not found' });

    const docData = doc.data();
    const isOwner = docData.user_id === req.user?.id;
    const isStaff = [opts.staffRole, 'founder', 'superadmin'].includes(req.user?.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    updates.updated_at = new Date().toISOString();
    await docRef.update(updates);
    res.json({ id, ...docData, ...updates });
  }

  // DELETE .../complaints/:id — only the employee who raised it can delete it
  // (not staff/founder — they resolve/close tickets via status instead,
  // deleting is the requester's own "never mind" action).
  async function deleteComplaint(req, res) {
    const { id } = req.params;
    const docRef = collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Complaint not found' });

    if (doc.data().user_id !== req.user?.id) {
      return res.status(403).json({ error: 'Forbidden: you can only delete your own ticket' });
    }

    const batch = db.batch();
    batch.delete(docRef);

    // A ticket sent for approval leaves a linked approvals/{id} record
    // behind (complaintRef, set in updateStatus above) — without this, the
    // Founder's Approval Center would keep showing (and letting someone
    // decide on) an approval for a ticket that no longer exists.
    const linkedApprovals = await db
      .collection('approvals')
      .where('complaintRef.collection', '==', opts.collectionName)
      .where('complaintRef.id', '==', id)
      .get();
    linkedApprovals.docs.forEach((d) => batch.delete(d.ref));

    await batch.commit();
    res.json({ id, deleted: true });
  }

  return { createComplaint, getAllComplaints, getMyComplaints, searchByToken, updateStatus, updateFields, deleteComplaint };
}

module.exports = { createComplaintController };
