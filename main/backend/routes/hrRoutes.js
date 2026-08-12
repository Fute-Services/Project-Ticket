const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const {
  createComplaint,
  getAllComplaints,
  getMyComplaints,
  searchByToken,
  updateStatus,
  updateFields,
} = require('../controllers/hrController');

// Any logged-in user can submit an HR complaint
router.post('/complaints', auth, createComplaint);

// Only HR staff and founders can see all complaints
router.get('/complaints', auth, role('hr', 'founder'), getAllComplaints);

// Any logged-in user can see their own complaints
router.get('/complaints/my', auth, getMyComplaints);

// Any logged-in user can search by token
router.get('/complaints/search', auth, searchByToken);

// Only HR staff and founders can update status
router.patch('/complaints/:id/status', auth, role('hr', 'founder'), updateStatus);

// HR staff, founders, or the submitter employee can update ticket fields
router.patch('/complaints/:id/fields', auth, updateFields);

module.exports = router;
