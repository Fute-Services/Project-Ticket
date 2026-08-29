const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const { createApproval, listApprovals, decideApproval, addRemark } = require('../controllers/approvalController');

// IT/HR desks raise requests and read the feed. Deciding is founder-only
// for most categories, except 'document'/'extra-hours' which HR may also
// decide — that per-category check lives inside decideApproval itself,
// since a category isn't known until the approval doc is read.
router.post('/', auth, role('it', 'hr', 'founder'), createApproval);
router.get('/', auth, role('it', 'hr', 'founder'), listApprovals);
router.patch('/:id/decide', auth, role('hr', 'founder'), decideApproval);
router.post('/:id/remarks', auth, role('it', 'hr', 'founder'), addRemark);

module.exports = router;
