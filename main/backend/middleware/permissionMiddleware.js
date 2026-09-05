const { db } = require('../config/db');
const { fail } = require('../utils/respond');

const ACTION_PERMISSIONS_DOC = db.collection('settings').doc('action_permissions');

// Same short-lived cache pattern as sessions.js's isSessionRevoked — this
// doc changes only when Super Admin edits the Action Permissions panel, so
// re-reading it from Firestore on every single asset create/edit/delete
// isn't worth the freshness (a change landing within ~30s is fine, and
// updateActionPermissions below clears the cache immediately on write).
const CACHE_MS = 30_000;
let cached = null; // { data, expiresAt }

// Only used as a fallback when Super Admin has never touched the Action
// Permissions panel at all (the doc doesn't exist yet) — preserves today's
// actual behavior (it/founder can manage assets) for a fresh deploy, without
// falling back to "allow everything" the moment Super Admin actually starts
// configuring the matrix. See requirePermission below.
const DEFAULT_ACTION_PERMISSIONS = {
  it: { assets: ['create', 'edit', 'delete'] },
  founder: { assets: ['create', 'edit', 'delete'] },
};

async function getActionPermissionsMatrix() {
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const doc = await ACTION_PERMISSIONS_DOC.get();
  const data = doc.exists ? doc.data() : DEFAULT_ACTION_PERMISSIONS;
  cached = { data, expiresAt: Date.now() + CACHE_MS };
  return data;
}

function clearActionPermissionsCache() {
  cached = null;
}

// Granular action-level gate, layered AFTER roleMiddleware (which already
// confirmed the role may touch this route family at all). A role/resource
// combo with no explicit entry in the matrix now defaults to DENIED, not
// allowed — this used to default-allow, so a typo'd resource/action name in
// the Action Permissions panel (or a new resource added later with no entry
// yet) silently granted full access instead of blocking it.
function requirePermission(resource, action) {
  return async (req, res, next) => {
    if (!req.user) return fail(res, { status: 401, message: 'Unauthorized', code: 'UNAUTHORIZED' });
    if (req.user.role === 'superadmin') return next();
    try {
      const matrix = await getActionPermissionsMatrix();
      const allowedActions = matrix[req.user.role]?.[resource];
      if (allowedActions && allowedActions.includes(action)) return next();
      return fail(res, { status: 403, message: `Missing permission: ${resource}.${action}`, code: 'FORBIDDEN' });
    } catch (e) {
      return fail(res, { status: 500, message: 'Permission check failed', code: 'INTERNAL_ERROR' });
    }
  };
}

module.exports = { requirePermission, ACTION_PERMISSIONS_DOC, clearActionPermissionsCache };
