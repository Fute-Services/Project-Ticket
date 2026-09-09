const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const validateFields = require('../middleware/validateFields');
const { getProjects, createProject, updateProject, getTasks, createTask, updateTaskStatus, updateTask } = require('../controllers/taskProjectController');
const { listStaffByRole } = require('../controllers/staffController');

router.get('/projects', auth, getProjects);
router.post('/projects', auth, role('coordinator', 'founder'), validateFields({ name: 200, client: 200, figma: 500, repo: 500 }), createProject);
router.patch('/projects/:id', auth, role('coordinator', 'founder'), validateFields({ name: 200, client: 200, figma: 500, repo: 500 }), updateProject);
router.get('/tasks', auth, getTasks);
// Real employee-role login accounts, for the assignee picker — a task must
// be assignable only to an account that can actually see it on their own
// dashboard (see getTasks/updateTaskStatus below, which match by this id).
router.get('/employees', auth, role('coordinator', 'founder'), listStaffByRole('employee'));
router.post('/tasks', auth, role('coordinator', 'founder'), validateFields({ title: 300, figma: 500, pr: 500 }), createTask);
router.patch('/tasks/:id/status', auth, updateTaskStatus);
router.patch('/tasks/:id', auth, role('coordinator', 'founder'), validateFields({ title: 300, figma: 500, pr: 500 }), updateTask);

module.exports = router;
