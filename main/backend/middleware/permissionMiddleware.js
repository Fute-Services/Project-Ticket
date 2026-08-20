const { db } = require('../config/firebase');

const ACTION_PERMISSIONS_DOC = db.collection('settings').doc('action_permissions');

// Same short-lived cache pattern as sessions.js's isSessionRevoked — this
// doc changes only when Super Admin edits the Action Permissions panel, so
// re-reading it from Firestore on every single asset create/edit/delete
// isn't worth the freshness (a change landing within ~30s is fine, and
// updateActionPermissions below clears the cache immediately on write).
const CACHE_MS = 30_000;
let cached = null; // { data, expiresAt }

async function getActionPermissionsMatrix() {
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const doc = await ACTION_PERMISSIONS_DOC.get();
  const data = doc.exists ? doc.data() : {};
  cached = { data, expiresAt: Date.now() + CACHE_MS };
  return data;
}

function clearActionPermissionsCache() {
  cached = null;
}

// Granular action-level gate, layered AFTER roleMiddleware (which already
// confirmed the role may touch this route family at all). Unconfigured
// role/resource combos default to allowed — same default-allow behavior as
// the existing page-level `canAccess` in PermissionsContext — so shipping
// this doesn't retroactively lock anyone out until Super Admin explicitly
// restricts something via the Action Permissions panel.
function requirePermission(resource, action) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role === 'superadmin') return next();
    try {
      const matrix = await getActionPermissionsMatrix();
      const allowedActions = matrix[req.user.role]?.[resource];
      if (!allowedActions || allowedActions.includes(action)) return next();
      return res.status(403).json({ error: `Missing permission: ${resource}.${action}` });
    } catch (e) {
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

module.exports = { requirePermission, ACTION_PERMISSIONS_DOC, clearActionPermissionsCache };
