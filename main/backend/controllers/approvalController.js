const { db } = require('../config/firebase');
const { paginatedQuery } = require('../utils/pagination');

const collection = db.collection('approvals');

function sortByRecent(docs) {
  return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// POST /api/approvals — manual approval request (asset requests, data
// transfers, etc.) raised directly by IT/HR desks, distinct from the
// automatic ones itController/hrController create on 'Waiting Approval'.
async function createApproval(req, res) {
  const { title, sub, requestedBy, priority, category, source, assetIdRef } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

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
  res.status(201).json({ id: docRef.id, ...docData });
}

// GET /api/approvals?after=<cursor> — IT/HR desks and the founder all read
// this feed (founder decides, IT/HR watch their own requests move through
// it), 20 at a time.
async function listApprovals(req, res) {
  const { docs, nextCursor } = await paginatedQuery(collection, 'createdAt', req.query.after);
  const data = docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({ items: sortByRecent(data), nextCursor });
}

const DECISIONS = ['approved', 'rejected'];

// PATCH /api/approvals/:id/decide — founder only.
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
  if (!DECISIONS.includes(status)) return res.status(400).json({ error: 'status must be approved or rejected' });

  const docRef = collection.doc(id);
  const decidedAt = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    if (!doc.exists) throw Object.assign(new Error('Approval not found'), { status: 404 });
    const approval = doc.data();
    if (approval.status !== 'pending_founder') {
      throw Object.assign(new Error('This approval has already been decided'), { status: 409 });
    }

    let ticketRef = null;
    if (approval.complaintRef) {
      const { collection: refCollection, id: refId } = approval.complaintRef;
      ticketRef = db.collection(refCollection).doc(refId);
      // Firestore transactions require all reads before any writes.
      await tx.get(ticketRef);
    }

    tx.update(docRef, { status, decidedAt, decidedBy: req.user.full_name });

    // Hand the linked ticket back to its normal workflow — approved moves
    // it forward, rejected reverts to whatever status it was in before it
    // was sent for approval.
    if (ticketRef) {
      const nextStatus = status === 'approved' ? 'In Progress' : (approval.previousStatus || 'Pending');
      tx.update(ticketRef, { status: nextStatus, updated_at: decidedAt });
    }
  }).catch((err) => {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  });

  if (res.headersSent) return;
  res.json({ id, ...(await docRef.get()).data() });
}

module.exports = { createApproval, listApprovals, decideApproval };
