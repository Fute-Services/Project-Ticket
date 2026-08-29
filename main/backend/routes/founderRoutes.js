const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');

// The 60s cache in computeAnalytics/getDashboardOverview absorbs repeated
// identical requests, but a caller varying the from/to query params bypasses
// that cache — this backstops the underlying multi-collection scan itself.
const expensiveReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down', error: { code: 'RATE_LIMITED', details: null } },
});
// Split from a single 951-line founderController.js into one file per real
// concern (user mgmt, analytics, SLA, notifications, departments,
// permissions, system settings, dashboard/search) — each below owns exactly
// the routes it's required for, so this list stays the map of who owns what.
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
} = require('../controllers/superAdminUserController');
const { getAnalytics, getAnalyticsCsv } = require('../controllers/analyticsController');
const { getSystemSettings, updateSystemSettings } = require('../controllers/systemSettingsController');
const {
  getRolePermissions,
  updateRolePermissions,
  getActionPermissions,
  updateActionPermissions,
  getPermissions,
} = require('../controllers/permissionController');
const { listDepartments, createDepartment, updateDepartment, deleteDepartment } = require('../controllers/departmentController');
const { getSlaPolicies, updateSlaPolicies, getSlaCompliance } = require('../controllers/slaController');
const { getNotificationRules, updateNotificationRules } = require('../controllers/notificationController');
const { getDashboardOverview, search, getActivityTimeline, updateDashboardLayout } = require('../controllers/dashboardController');

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
router.get('/analytics', auth, role('superadmin'), expensiveReadLimiter, getAnalytics);
router.get('/analytics/export', auth, role('superadmin'), expensiveReadLimiter, getAnalyticsCsv);
router.get('/search', auth, role('superadmin'), search);
router.get('/activity-timeline', auth, role('superadmin'), getActivityTimeline);
router.patch('/dashboard-layout', auth, role('superadmin'), updateDashboardLayout);
router.get('/dashboard-overview', auth, role('superadmin'), expensiveReadLimiter, getDashboardOverview);

// SLA policies — readable by anyone logged in, writable by Super Admin only.
router.get('/sla-policies', auth, getSlaPolicies);
router.put('/sla-policies', auth, role('superadmin'), updateSlaPolicies);
router.get('/sla-compliance', auth, role('superadmin'), expensiveReadLimiter, getSlaCompliance);

// Notification rules — Super Admin only, both read and write.
router.get('/notification-rules', auth, role('superadmin'), getNotificationRules);
router.put('/notification-rules', auth, role('superadmin'), updateNotificationRules);

// Every logged-in user reads the role-level page permissions to gate their
// own nav; only Super Admin can change them.
router.get('/role-permissions', auth, getRolePermissions);
router.put('/role-permissions', auth, role('superadmin'), updateRolePermissions);

// Same pattern — readable by anyone logged in, writable by Super Admin only.
router.get('/system-settings', auth, getSystemSettings);
router.put('/system-settings', auth, role('superadmin'), updateSystemSettings);

// Departments — readable by anyone logged in (dropdowns elsewhere need the
// list), writable by Super Admin only.
router.get('/departments', auth, listDepartments);
router.post('/departments', auth, role('superadmin'), createDepartment);
router.patch('/departments/:id', auth, role('superadmin'), updateDepartment);
router.delete('/departments/:id', auth, role('superadmin'), deleteDepartment);

// Action-level permission matrix — readable by anyone logged in, writable
// by Super Admin only, same convention as role-permissions/system-settings.
router.get('/action-permissions', auth, getActionPermissions);
router.put('/action-permissions', auth, role('superadmin'), updateActionPermissions);

// Combined read for PermissionsContext's poll — role-permissions and
// action-permissions stay separate docs for writes (see updateActionPermissions'
// comment), but every logged-in session polls both together, so give it one
// round trip instead of two.
router.get('/permissions', auth, getPermissions);

module.exports = router;
