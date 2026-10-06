const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const validateFields = require('../middleware/validateFields');
const c = require('../controllers/projectSheetController');

// Shared by sales + coordinator (+ founder); the controller limits which
// columns each role may write.
const gate = [auth, role('sales', 'coordinator', 'founder')];
const lengths = validateFields({ projectCode: 100, clientName: 200, projectName: 200, qty: 200, outputDriveLink: 1000, asanaLink: 1000, remarks: 2000 });

router.get('/', ...gate, c.list);
router.post('/', ...gate, lengths, c.create);
router.patch('/:id', ...gate, lengths, c.update);

module.exports = router;
