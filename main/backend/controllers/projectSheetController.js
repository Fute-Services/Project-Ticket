const { db } = require('../config/db');
const { UNPAGINATED_READ_LIMIT } = require('../utils/constants');
const { ok, created, fail } = require('../utils/respond');

const sheet = db.collection('projectSheet');

const STATUSES = ['Active', 'Closed'];
// Sales fills the base columns; only coordinator/founder may touch the rest.
const SALES_FIELDS = ['projectCode', 'clientName', 'projectName', 'qty', 'scope', 'status', 'outputDriveLink'];
const COORDINATOR_FIELDS = ['asanaLink', 'remarks'];

function pick(body, role) {
  const allowed = role === 'sales' ? SALES_FIELDS : [...SALES_FIELDS, ...COORDINATOR_FIELDS];
  const out = {};
  for (const k of allowed) if (body[k] !== undefined) out[k] = body[k];
  return out;
}

function invalid(res, message) {
  fail(res, { status: 400, message, code: 'VALIDATION_ERROR' });
}

// Status may be blank (some sheet rows have none) or one of STATUSES.
const badStatus = (s) => s !== undefined && s !== '' && !STATUSES.includes(s);

async function list(req, res) {
  const snap = await sheet.limit(UNPAGINATED_READ_LIMIT).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.slNo || 0) - (b.slNo || 0));
  ok(res, rows);
}

async function create(req, res) {
  const data = pick(req.body, req.user.role);
  if (!data.projectCode || !data.clientName || !data.projectName) return invalid(res, 'projectCode, clientName and projectName are required');
  if (badStatus(data.status)) return invalid(res, `status must be one of: ${STATUSES.join(', ')}`);
  // ponytail: max+1 read-then-write can collide on concurrent creates; use a counter doc if it matters.
  const all = await sheet.limit(UNPAGINATED_READ_LIMIT).get();
  const slNo = all.docs.reduce((m, d) => Math.max(m, d.data().slNo || 0), 0) + 1;
  const doc = { qty: '', scope: '', status: 'Active', outputDriveLink: '', asanaLink: '', remarks: '', ...data, slNo, created_at: new Date().toISOString() };
  const ref = await sheet.add(doc);
  created(res, { id: ref.id, ...doc }, 'Row added');
}

async function update(req, res) {
  const ref = sheet.doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) return fail(res, { status: 404, message: 'Row not found', code: 'NOT_FOUND' });
  const updates = pick(req.body, req.user.role);
  if (!Object.keys(updates).length) return invalid(res, 'No editable fields provided');
  if (badStatus(updates.status)) return invalid(res, `status must be one of: ${STATUSES.join(', ')}`);
  updates.updated_at = new Date().toISOString();
  await ref.update(updates);
  ok(res, { id: req.params.id, ...snap.data(), ...updates }, { message: 'Row updated' });
}

module.exports = { list, create, update };
