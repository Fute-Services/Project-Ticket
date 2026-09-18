const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const validateFields = require('../middleware/validateFields');
const { getProjects, createProject, updateProject, getTasks, createTask, updateTaskStatus, updateTask, updateTaskRemarks } = require('../controllers/taskProjectController');
const { listStaffByRole } = require('../controllers/staffController');
const { getProductionRecords, createProductionRecord, updateProductionRecord } = require('../controllers/productionTrackerController');

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
router.patch('/tasks/:id/remarks', auth, validateFields({ remarks: 2000 }), updateTaskRemarks);
router.patch('/tasks/:id', auth, role('coordinator', 'founder'), validateFields({ title: 300, figma: 500, pr: 500 }), updateTask);

// Production & Delivery Tracker - coordinator/founder only, an admin/billing
// tool rather than something an employee's own dashboard needs to see.
router.get('/production-records', auth, role('coordinator', 'founder'), getProductionRecords);
router.post(
  '/production-records',
  auth,
  role('coordinator', 'founder'),
  validateFields({ projectCode: 100, scopeOfWork: 2000, clientPOC: 200, deliveryRemarks: 2000, outputDriveLink: 1000 }),
  createProductionRecord
);
router.patch(
  '/production-records/:id',
  auth,
  role('coordinator', 'founder'),
  validateFields({ projectCode: 100, scopeOfWork: 2000, clientPOC: 200, deliveryRemarks: 2000, outputDriveLink: 1000 }),
  updateProductionRecord
);

module.exports = router;
