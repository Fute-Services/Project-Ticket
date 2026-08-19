const { db } = require('../config/firebase');

const ACTION_PERMISSIONS_DOC = db.collection('settings').doc('action_permissions');

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
      const doc = await ACTION_PERMISSIONS_DOC.get();
      const roleMatrix = doc.exists ? doc.data()[req.user.role] : null;
      const allowedActions = roleMatrix?.[resource];
      if (!allowedActions || allowedActions.includes(action)) return next();
      return res.status(403).json({ error: `Missing permission: ${resource}.${action}` });
    } catch (e) {
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

module.exports = { requirePermission, ACTION_PERMISSIONS_DOC };
