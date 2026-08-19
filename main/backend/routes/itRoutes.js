const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
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
router.patch('/complaints/:id/fields', auth, updateFields);

// Asset writes are also gated by the granular action-permission matrix
// (Super Admin → Action Permissions), on top of the coarser role check —
// e.g. IT can be allowed to create/edit assets but denied delete.
router.post('/assets', auth, role('it', 'founder'), requirePermission('assets', 'create'), createAsset);
router.get('/assets', auth, role('it', 'founder'), getAllAssets);
router.put('/assets/:id', auth, role('it', 'founder'), requirePermission('assets', 'edit'), updateAsset);
router.delete('/assets/:id', auth, role('it', 'founder'), requirePermission('assets', 'delete'), deleteAsset);

module.exports = router;
