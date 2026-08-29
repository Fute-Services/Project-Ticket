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
  deleteComplaint,
  reopenComplaint,
} = require('../controllers/hrController');
const { listStaffByRole } = require('../controllers/staffController');

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

// Only the submitter employee can delete their own ticket
router.delete('/complaints/:id', auth, deleteComplaint);

// Only the submitter employee can reopen their own resolved ticket
router.patch('/complaints/:id/reopen', auth, reopenComplaint);

// Names of active HR staff, for the queue's "Resolved By" dropdown — same
// audience as the queue itself.
router.get('/staff', auth, role('hr', 'founder'), listStaffByRole('hr'));

module.exports = router;
