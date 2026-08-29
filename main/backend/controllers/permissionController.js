const { db } = require('../config/firebase');
const { logAudit } = require('../utils/auditLog');
const { ACTION_PERMISSIONS_DOC, clearActionPermissionsCache } = require('../middleware/permissionMiddleware');
const { ok, fail } = require('../utils/respond');

const ROLE_PERMISSIONS_DOC = db.collection('settings').doc('role_permissions');

// GET /api/founder/role-permissions — every logged-in user reads this to
// gate their own nav (PermissionsContext.canAccess), not just Super Admin.
async function getRolePermissions(req, res) {
  const doc = await ROLE_PERMISSIONS_DOC.get();
  ok(res, doc.exists ? doc.data() : {});
}

// PUT /api/founder/role-permissions — Super Admin only. Frontend sends the
// full { [role]: [pageId, ...] } map each time (togglePermission/
// setAllForRole both recompute the whole object), so this replaces wholesale
// rather than merging.
async function updateRolePermissions(req, res) {
  const { permissions } = req.body;
  if (!permissions || typeof permissions !== 'object') {
    return fail(res, { status: 400, message: 'permissions object is required', code: 'VALIDATION_ERROR' });
  }
  await ROLE_PERMISSIONS_DOC.set(permissions);
  await logAudit({ actor: req.user, action: 'update_role_permissions', details: { permissions } });
  ok(res, { permissions }, { message: 'Role permissions updated successfully' });
}

// GET /api/founder/action-permissions — every logged-in user reads this so
// the frontend can hide buttons for actions the backend would 403 anyway;
// only Super Admin can change it. Separate doc from role_permissions (not a
// key inside it) because updateRolePermissions does a full `.set()` of that
// doc from the page-toggle UI — sharing one doc would let a page-visibility
// change silently wipe out the action matrix.
async function getActionPermissions(req, res) {
  const doc = await ACTION_PERMISSIONS_DOC.get();
  ok(res, doc.exists ? doc.data() : {});
}

// GET /api/founder/permissions — combined read of role-permissions +
// action-permissions for PermissionsContext's single poll tick, so a session
// doesn't fire two separate requests for what's always fetched together.
async function getPermissions(req, res) {
  const [pagesDoc, actionsDoc] = await Promise.all([ROLE_PERMISSIONS_DOC.get(), ACTION_PERMISSIONS_DOC.get()]);
  ok(res, {
    pages: pagesDoc.exists ? pagesDoc.data() : {},
    actions: actionsDoc.exists ? actionsDoc.data() : {},
  });
}

// PUT /api/founder/action-permissions — { permissions: { [role]: { [resource]: [action,...] } } }
async function updateActionPermissions(req, res) {
  const { permissions } = req.body;
  if (!permissions || typeof permissions !== 'object') {
    return fail(res, { status: 400, message: 'permissions object is required', code: 'VALIDATION_ERROR' });
  }
  await ACTION_PERMISSIONS_DOC.set(permissions);
  clearActionPermissionsCache();
  await logAudit({ actor: req.user, action: 'update_action_permissions', details: { permissions } });
  ok(res, { permissions }, { message: 'Action permissions updated successfully' });
}

module.exports = { getRolePermissions, updateRolePermissions, getActionPermissions, updateActionPermissions, getPermissions };
