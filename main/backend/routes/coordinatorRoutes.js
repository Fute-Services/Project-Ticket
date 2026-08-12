const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const { getProjects, getTasks, createTask, updateTaskStatus, updateTask } = require('../controllers/taskProjectController');

router.get('/projects', auth, getProjects);
router.get('/tasks', auth, getTasks);
router.post('/tasks', auth, role('coordinator', 'founder'), createTask);
router.patch('/tasks/:id/status', auth, updateTaskStatus);
router.patch('/tasks/:id', auth, role('coordinator', 'founder'), updateTask);

module.exports = router;
