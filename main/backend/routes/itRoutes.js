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
} = require('../controllers/itController');

router.post('/complaints', auth, createComplaint);
router.get('/complaints', auth, role('it', 'founder'), getAllComplaints);
router.get('/complaints/my', auth, getMyComplaints);
router.get('/complaints/search', auth, searchByToken);
router.patch('/complaints/:id/status', auth, role('it', 'founder'), updateStatus);

module.exports = router;
