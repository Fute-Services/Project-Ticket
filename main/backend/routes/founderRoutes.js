const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const { getAllComplaints, listUsers, updateUserPermissions, createUser } = require('../controllers/founderController');

router.get('/complaints', auth, role('founder'), getAllComplaints);
// Role Permissions moved to Super Admin — these three are no longer
// Founder's to call, even directly against the API.
router.get('/users', auth, role('superadmin'), listUsers);
router.post('/users', auth, role('superadmin'), createUser);
router.patch('/users/:uid/permissions', auth, role('superadmin'), updateUserPermissions);

module.exports = router;
