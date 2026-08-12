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
} = require('../controllers/itController');
const { createAsset, getAllAssets, updateAsset, deleteAsset } = require('../controllers/assetController');

router.post('/complaints', auth, createComplaint);
router.get('/complaints', auth, role('it', 'founder'), getAllComplaints);
router.get('/complaints/my', auth, getMyComplaints);
router.get('/complaints/search', auth, searchByToken);
router.patch('/complaints/:id/status', auth, role('it', 'founder'), updateStatus);
router.patch('/complaints/:id/fields', auth, role('it', 'founder'), updateFields);

router.post('/assets', auth, role('it', 'founder'), createAsset);
router.get('/assets', auth, role('it', 'founder'), getAllAssets);
router.put('/assets/:id', auth, role('it', 'founder'), updateAsset);
router.delete('/assets/:id', auth, role('it', 'founder'), deleteAsset);

module.exports = router;
