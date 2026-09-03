const { db } = require('../config/db');
const { paginatedQuery } = require('../utils/pagination');
const { sendMail, escapeHtml } = require('../utils/mailer');
const { ok, created, fail } = require('../utils/respond');

const collection = db.collection('approvals');

// 'document' approvals are HR's own call (Payel/Soma, in the original
// notes — modeled as the 'hr' role, not named accounts, see
// hrDeskController.js). 'extra-hours' is explicitly founder-only (decided
// later — HR cannot decide these even though it can decide documents).
// Every other category (ticket-linked "Waiting Approval" escalations,
// asset/data requests) stays founder-only too, same as before either
// category existed.
const HR_DECIDABLE_CATEGORIES = ['document'];

async function notifyFounder(subject, html) {
  try {
    const snap = await db.collection('users').where('role', '==', 'founder').limit(5).get();
    await Promise.all(snap.docs.map((d) => sendMail(d.data().email, subject, html).catch(() => {})));
  } catch (e) {
    console.error('Failed to notify founder:', e.message);
  }
}

function sortByRecent(docs) {
  return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// POST /api/approvals — manual approval request (asset requests, data
// transfers, etc.) raised directly by IT/HR desks, distinct from the
// automatic ones itController/hrController create on 'Waiting Approval'.
async function createApproval(req, res) {
  const { title, sub, requestedBy, priority, category, source, assetIdRef } = req.body;
  if (!title) return fail(res, { status: 400, message: 'title is required', code: 'VALIDATION_ERROR' });

  const docData = {
    source: source || 'IT',
    title,
    sub: sub || '',
    requestedBy: requestedBy || req.user.full_name,
    priority: priority || 'medium',
    category: category || 'General',
    status: 'pending_founder',
    assetIdRef: assetIdRef || null,
    createdAt: new Date().toISOString(),
  };

  const docRef = await collection.add(docData);
  created(res, { id: docRef.id, ...docData }, 'Approval request created successfully');
}

// GET /api/approvals?after=<cursor> — IT/HR desks and the founder all read
// this feed (founder decides, IT/HR watch their own requests move through
// it), 20 at a time.
async function listApprovals(req, res) {
  const { docs, nextCursor } = await paginatedQuery(collection, 'createdAt', req.query.after);
  const data = docs.map((d) => ({ id: d.id, ...d.data() }));
  ok(res, { items: sortByRecent(data), nextCursor });
}

const DECISIONS = ['approved', 'rejected'];

// PATCH /api/approvals/:id/decide — founder-only for every category except
// 'document'/'extra-hours', which HR may also decide (see
// HR_DECIDABLE_CATEGORIES above). The role check for those two categories
// happens inside the transaction (after the category is known), not at the
// route, so the route stays a single shared endpoint for every category.
//
// Runs as a single Firestore transaction so the approval doc and its linked
// ticket either both update or neither does — previously these were two
// independent writes, so a failure between them could strand a ticket in
// "Waiting Approval" forever with no approval record left to act on. The
// transaction also re-reads the approval's status before writing, so
// deciding an already-decided approval twice (a retried request, two
// founder tabs) is rejected instead of silently re-applying the outcome.
async function decideApproval(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!DECISIONS.includes(status)) return fail(res, { status: 400, message: 'status must be approved or rejected', code: 'VALIDATION_ERROR' });

  const docRef = collection.doc(id);
  const decidedAt = new Date().toISOString();
  let approvalForNotify = null;

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    if (!doc.exists) throw Object.assign(new Error('Approval not found'), { status: 404 });
    const approval = doc.data();
    if (approval.status !== 'pending_founder') {
      throw Object.assign(new Error('This approval has already been decided'), { status: 409 });
    }
    if (req.user.role !== 'founder' && !(req.user.role === 'hr' && HR_DECIDABLE_CATEGORIES.includes(approval.category))) {
      throw Object.assign(new Error('Only the founder can decide this approval'), { status: 403 });
    }
    approvalForNotify = approval;

    let ticketRef = null;
    if (approval.complaintRef) {
      const { collection: refCollection, id: refId } = approval.complaintRef;
      ticketRef = db.collection(refCollection).doc(refId);
      // Firestore transactions require all reads before any writes.
      await tx.get(ticketRef);
    }

    // Extra Hours only counts toward Directory's "Extra Hours: Xh logged"
    // once approved (see Directory.jsx) — the extra_hours doc's own status
    // has to mirror the approval's decision, not just the approvals doc.
    let extraHoursRef = null;
    if (approval.extraHoursId) {
      extraHoursRef = db.collection('extra_hours').doc(approval.extraHoursId);
      await tx.get(extraHoursRef);
    }

    tx.update(docRef, { status, decidedAt, decidedBy: req.user.full_name });

    // Hand the linked ticket back to its normal workflow — approved moves
    // it forward, rejected reverts to whatever status it was in before it
    // was sent for approval.
    if (ticketRef) {
      const nextStatus = status === 'approved' ? 'In Progress' : (approval.previousStatus || 'Pending');
      tx.update(ticketRef, { status: nextStatus, updated_at: decidedAt });
    }

    if (extraHoursRef) {
      tx.update(extraHoursRef, { status, decidedAt, decidedBy: req.user.full_name });
    }
  }).catch((err) => {
    if (err.status) {
      const codeByStatus = { 404: 'NOT_FOUND', 409: 'CONFLICT', 403: 'FORBIDDEN' };
      return fail(res, { status: err.status, message: err.message, code: codeByStatus[err.status] || 'REQUEST_FAILED' });
    }
    throw err;
  });

  if (res.headersSent) return;

  // Only for the two categories HR can decide without the Founder — if the
  // Founder just decided it themselves, they don't need an email about it.
  if (approvalForNotify && HR_DECIDABLE_CATEGORIES.includes(approvalForNotify.category) && req.user.role !== 'founder') {
    await notifyFounder(
      `${status === 'approved' ? 'Approved' : 'Rejected'} by ${req.user.full_name} — ${approvalForNotify.title}`,
      `<p><strong>${escapeHtml(req.user.full_name)}</strong> ${status} "${escapeHtml(approvalForNotify.title)}".</p>`
    );
  }

  ok(res, { id, ...(await docRef.get()).data() }, { message: 'Approval decided successfully' });
}

// POST /api/approvals/:id/remarks — a remark on any approval (documents,
// extra-hours, etc.) always emails the Founder, same as a decision does —
// per the "Founder is copied on approvals and remarks alike" requirement.
async function addRemark(req, res) {
  const { id } = req.params;
  const { text } = req.body;
  if (!text || !text.trim()) return fail(res, { status: 400, message: 'Remark text is required', code: 'VALIDATION_ERROR' });

  const docRef = collection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return fail(res, { status: 404, message: 'Approval not found', code: 'NOT_FOUND' });

  const remark = { text: text.trim(), by: req.user.full_name, at: new Date().toISOString() };
  const remarks = [...(doc.data().remarks || []), remark];
  await docRef.update({ remarks });

  await notifyFounder(
    `New remark — ${doc.data().title}`,
    `<p><strong>${escapeHtml(req.user.full_name)}</strong> left a remark on "${escapeHtml(doc.data().title)}": ${escapeHtml(text.trim())}</p>`
  );

  ok(res, { id, remarks }, { message: 'Remark added successfully' });
}

module.exports = { createApproval, listApprovals, decideApproval, addRemark };
