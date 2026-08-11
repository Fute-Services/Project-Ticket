const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const { getAllComplaints, listUsers, updateUserPermissions, createUser } = require('../controllers/founderController');

router.get('/complaints', auth, role('founder'), getAllComplaints);
router.get('/users', auth, role('founder'), listUsers);
router.post('/users', auth, role('founder'), createUser);
router.patch('/users/:uid/permissions', auth, role('founder'), updateUserPermissions);

module.exports = router;
