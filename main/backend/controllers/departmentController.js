const { db } = require('../config/db');
const { logAudit } = require('../utils/auditLog');
const { UNPAGINATED_READ_LIMIT } = require('../utils/constants');
const { ok, created, fail } = require('../utils/respond');

const DEPARTMENTS = db.collection('departments');

// GET /api/founder/departments — readable by anyone logged in, same pattern
// as system-settings/role-permissions (dropdowns elsewhere need the list).
// This is its own registry, managed only through this page — it does not
// read or migrate from the free-text `department` field on user records,
// since that field is used inconsistently (job titles, team names) across
// other roles and isn't a reliable source for a clean department list.
async function listDepartments(req, res) {
  const snap = await DEPARTMENTS.limit(UNPAGINATED_READ_LIMIT).get();
  ok(res, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

// POST /api/founder/departments — { name, head? }
async function createDepartment(req, res) {
  const { name, head } = req.body;
  if (!name || !name.trim()) return fail(res, { status: 400, message: 'name is required', code: 'VALIDATION_ERROR' });
  const dept = { name: name.trim(), head: head || null, active: true, created_at: new Date().toISOString() };
  const ref = await DEPARTMENTS.add(dept);
  await logAudit({ actor: req.user, action: 'create_department', target: { type: 'department', id: ref.id, name: dept.name } });
  created(res, { id: ref.id, ...dept }, 'Department created successfully');
}

// PATCH /api/founder/departments/:id — { name?, head?, active? }
async function updateDepartment(req, res) {
  const { id } = req.params;
  const { name, head, active } = req.body;
  const ref = DEPARTMENTS.doc(id);
  const doc = await ref.get();
  if (!doc.exists) return fail(res, { status: 404, message: 'Department not found', code: 'NOT_FOUND' });

  const before = doc.data();
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (head !== undefined) updates.head = head || null;
  if (active !== undefined) updates.active = !!active;
  await ref.set(updates, { merge: true });

  await logAudit({
    actor: req.user,
    action: 'update_department',
    target: { type: 'department', id, name: before.name },
    details: { before: { name: before.name, head: before.head, active: before.active }, after: updates },
  });
  ok(res, { id, ...before, ...updates }, { message: 'Department updated successfully' });
}

// DELETE /api/founder/departments/:id — refuses if any user still points at
// this department's name, same "no orphaned references" spirit as the user
// endpoints refusing to let Super Admin delete their own account.
async function deleteDepartment(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  const ref = DEPARTMENTS.doc(id);
  const doc = await ref.get();
  if (!doc.exists) return fail(res, { status: 404, message: 'Department not found', code: 'NOT_FOUND' });
  const { name } = doc.data();

  const inUse = await db.collection('users').where('department', '==', name).limit(1).get();
  if (!inUse.empty) {
    return fail(res, {
      status: 400,
      message: `${inUse.size >= 1 ? 'At least one' : 'A'} user is still assigned to "${name}" — reassign them first`,
      code: 'DEPARTMENT_IN_USE',
    });
  }

  await ref.delete();
  await logAudit({ actor: req.user, action: 'delete_department', target: { type: 'department', id, name }, details: reason ? { reason } : null });
  ok(res, { id, deleted: true }, { message: 'Department deleted successfully' });
}

module.exports = { listDepartments, createDepartment, updateDepartment, deleteDepartment, DEPARTMENTS };
