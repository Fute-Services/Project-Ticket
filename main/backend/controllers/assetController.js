const { db } = require('../config/firebase');

const collection = db.collection('assets');

// POST /api/it/assets — id is a business identifier the IT desk types in
// (e.g. "AST-1006"), so it's the Firestore doc id too, same convention the
// old mock data used.
async function createAsset(req, res) {
  const { id, type, model } = req.body;
  if (!id || !type || !model) return res.status(400).json({ error: 'id, type and model are required' });
  if (!/^[\w-]+$/.test(id)) {
    return res.status(400).json({ error: 'id may only contain letters, numbers, hyphens and underscores' });
  }

  const docRef = collection.doc(id);
  if ((await docRef.get()).exists) return res.status(409).json({ error: `Asset ${id} already exists` });

  const docData = {
    type,
    model,
    serialNo: req.body.serialNo || '',
    assignedTo: req.body.assignedTo || '—',
    department: req.body.department || '',
    purchaseDate: req.body.purchaseDate || '',
    warrantyEnd: req.body.warrantyEnd || '',
    status: req.body.status || 'Available',
    approvalStatus: req.body.approvalStatus || 'none',
    hardDisk: req.body.hardDisk || '',
    componentsList: req.body.componentsList || [],
    componentsLog: req.body.componentsLog || [],
    history: req.body.history || [],
    created_at: new Date().toISOString(),
  };

  await docRef.set(docData);
  res.status(201).json({ id, ...docData });
}

// GET /api/it/assets
async function getAllAssets(req, res) {
  const snap = await collection.limit(200).get();
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

const EDITABLE_FIELDS = [
  'type', 'model', 'serialNo', 'assignedTo', 'department', 'purchaseDate',
  'warrantyEnd', 'status', 'approvalStatus', 'hardDisk', 'componentsList', 'componentsLog', 'history',
];

// PUT /api/it/assets/:id — full-record edit, same fields the Add/Edit modal sends
async function updateAsset(req, res) {
  const { id } = req.params;
  const docRef = collection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ error: 'Asset not found' });

  const updates = {};
  for (const key of EDITABLE_FIELDS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  updates.updated_at = new Date().toISOString();
  await docRef.update(updates);
  res.json({ id, ...doc.data(), ...updates });
}

// DELETE /api/it/assets/:id
async function deleteAsset(req, res) {
  const { id } = req.params;
  const docRef = collection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ error: 'Asset not found' });
  await docRef.delete();
  res.json({ id });
}

module.exports = { createAsset, getAllAssets, updateAsset, deleteAsset };
