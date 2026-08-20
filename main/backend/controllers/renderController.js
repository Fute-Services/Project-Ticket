const { db } = require('../config/firebase');

const collection = db.collection('renders');

// GET /api/production/renders — read by Production and IT's read-only view.
// No `.orderBy('created_at')` on the query itself — Firestore silently
// drops any document missing the ordered field from the result set
// entirely. Sorting in JS after the fetch keeps the same bounded read
// (.limit(200)) without excluding anyone.
async function getAllRenders(req, res) {
  const snap = await collection.limit(200).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  res.json(rows);
}

// POST /api/production/renders
async function addRender(req, res) {
  const { personName } = req.body;
  if (!personName) return res.status(400).json({ error: 'personName is required' });

  const docData = {
    date: req.body.date || new Date().toISOString().slice(0, 10),
    sequence: req.body.sequence || '',
    frameNo: req.body.frameNo || '',
    personName,
    endDate: req.body.endDate || '',
    allocatedSystems: req.body.allocatedSystems || 1,
    status: req.body.status || 'Queue',
    created_at: new Date().toISOString(),
  };

  const docRef = await collection.add(docData);
  res.status(201).json({ id: docRef.id, ...docData });
}

const EDITABLE_FIELDS = ['date', 'sequence', 'frameNo', 'personName', 'endDate', 'allocatedSystems', 'status'];

// PATCH /api/production/renders/:id
async function updateRender(req, res) {
  const { id } = req.params;
  const updates = {};
  for (const key of EDITABLE_FIELDS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No editable fields provided' });

  const docRef = collection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ error: 'Render job not found' });

  updates.updated_at = new Date().toISOString();
  await docRef.update(updates);
  res.json({ id, ...doc.data(), ...updates });
}

module.exports = { getAllRenders, addRender, updateRender };
