const { db } = require('../config/firebase');
const { paginatedQuery } = require('../utils/pagination');
const { ok, created, fail } = require('../utils/respond');

function sortByRecent(rows) {
  return rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

const collection = db.collection('assets');

// POST /api/it/assets — id is a business identifier the IT desk types in
// (e.g. "AST-1006"), so it's the Firestore doc id too, same convention the
// old mock data used.
async function createAsset(req, res) {
  const { id, type, model } = req.body;
  if (!id || !type || !model) return fail(res, { status: 400, message: 'id, type and model are required', code: 'VALIDATION_ERROR' });
  if (!/^[\w-]+$/.test(id)) {
    return fail(res, { status: 400, message: 'id may only contain letters, numbers, hyphens and underscores', code: 'VALIDATION_ERROR' });
  }

  const docRef = collection.doc(id);
  if ((await docRef.get()).exists) return fail(res, { status: 409, message: `Asset ${id} already exists`, code: 'ASSET_ALREADY_EXISTS' });

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
  created(res, { id, ...docData }, 'Asset created successfully');
}

// GET /api/it/assets?after=<cursor> — 20 at a time (was a full-collection
// re-read every 5min poll — see paginatedQuery). Legacy assets with no
// created_at won't sort into the ordered query, same tradeoff Tickets/
// Approvals/Leave already accept for their own paginated lists.
async function getAllAssets(req, res) {
  const { docs, nextCursor } = await paginatedQuery(collection, 'created_at', req.query.after);
  const rows = docs.map((d) => ({ id: d.id, ...d.data() }));
  ok(res, { items: sortByRecent(rows), nextCursor });
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
  if (!doc.exists) return fail(res, { status: 404, message: 'Asset not found', code: 'NOT_FOUND' });

  const updates = {};
  for (const key of EDITABLE_FIELDS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  updates.updated_at = new Date().toISOString();
  await docRef.update(updates);
  ok(res, { id, ...doc.data(), ...updates }, { message: 'Asset updated successfully' });
}

// DELETE /api/it/assets/:id
async function deleteAsset(req, res) {
  const { id } = req.params;
  const docRef = collection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return fail(res, { status: 404, message: 'Asset not found', code: 'NOT_FOUND' });
  await docRef.delete();
  ok(res, { id }, { message: 'Asset deleted successfully' });
}

module.exports = { createAsset, getAllAssets, updateAsset, deleteAsset };
