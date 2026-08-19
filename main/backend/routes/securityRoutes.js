const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const {
  listSessions,
  revokeSession,
  forceLogoutUser,
  listFailedLogins,
  listLockedAccounts,
  unlockAccount,
} = require('../controllers/securityController');

// Everything here is Super Admin only — this is the Security Center, not a
// general-read/superadmin-write surface like role-permissions/settings.
router.get('/sessions', auth, role('superadmin'), listSessions);
router.patch('/sessions/:id/revoke', auth, role('superadmin'), revokeSession);
router.patch('/users/:uid/force-logout', auth, role('superadmin'), forceLogoutUser);
router.get('/failed-logins', auth, role('superadmin'), listFailedLogins);
router.get('/locked-accounts', auth, role('superadmin'), listLockedAccounts);
router.patch('/users/:uid/unlock', auth, role('superadmin'), unlockAccount);

module.exports = router;
