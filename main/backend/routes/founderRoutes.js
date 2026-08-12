const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const {
  getAllComplaints,
  listUsers,
  updateUserPermissions,
  createUser,
  updateUser,
  setUserActive,
  deleteUser,
  resetUserPassword,
  getAuditLogs,
  getAnalytics,
  getSystemSettings,
  updateSystemSettings,
  getRolePermissions,
  updateRolePermissions,
} = require('../controllers/founderController');

router.get('/complaints', auth, role('founder'), getAllComplaints);
// Role Permissions moved to Super Admin — these three are no longer
// Founder's to call, even directly against the API.
router.get('/users', auth, role('superadmin'), listUsers);
router.post('/users', auth, role('superadmin'), createUser);
router.patch('/users/:uid', auth, role('superadmin'), updateUser);
router.patch('/users/:uid/permissions', auth, role('superadmin'), updateUserPermissions);
router.patch('/users/:uid/active', auth, role('superadmin'), setUserActive);
router.patch('/users/:uid/reset-password', auth, role('superadmin'), resetUserPassword);
router.delete('/users/:uid', auth, role('superadmin'), deleteUser);

router.get('/audit-logs', auth, role('superadmin'), getAuditLogs);
router.get('/analytics', auth, role('superadmin'), getAnalytics);

// Every logged-in user reads the role-level page permissions to gate their
// own nav; only Super Admin can change them.
router.get('/role-permissions', auth, getRolePermissions);
router.put('/role-permissions', auth, role('superadmin'), updateRolePermissions);

// Same pattern — readable by anyone logged in, writable by Super Admin only.
router.get('/system-settings', auth, getSystemSettings);
router.put('/system-settings', auth, role('superadmin'), updateSystemSettings);

module.exports = router;
