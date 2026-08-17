const { db } = require('../config/firebase');

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

// GET /api/approvals — IT/HR desks and the founder all read this feed
// (founder decides, IT/HR watch their own requests move through it).
async function listApprovals(req, res) {
  const snap = await collection.limit(200).get();
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(sortByRecent(data));
}

const DECISIONS = ['approved', 'rejected'];

// PATCH /api/approvals/:id/decide — founder only.
async function decideApproval(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!DECISIONS.includes(status)) return res.status(400).json({ error: 'status must be approved or rejected' });

  const docRef = collection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ error: 'Approval not found' });
  const approval = doc.data();

  const decidedAt = new Date().toISOString();
  await docRef.update({ status, decidedAt, decidedBy: req.user.full_name });

  // Hand the linked ticket back to its normal workflow — approved moves it
  // forward, rejected reverts to whatever status it was in before it was
  // sent for approval.
  if (approval.complaintRef) {
    const { collection: refCollection, id: refId } = approval.complaintRef;
    const nextStatus = status === 'approved' ? 'In Progress' : (approval.previousStatus || 'Pending');
    await db.collection(refCollection).doc(refId).update({
      status: nextStatus,
      updated_at: decidedAt,
    });
  }

  res.json({ id, ...approval, status, decidedAt, decidedBy: req.user.full_name });
}

module.exports = { createApproval, listApprovals, decideApproval };
