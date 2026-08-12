const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const { createApproval, listApprovals, decideApproval } = require('../controllers/approvalController');

// IT/HR desks raise requests and read the feed; only the founder decides.
router.post('/', auth, role('it', 'hr', 'founder'), createApproval);
router.get('/', auth, role('it', 'hr', 'founder'), listApprovals);
router.patch('/:id/decide', auth, role('founder'), decideApproval);

module.exports = router;
