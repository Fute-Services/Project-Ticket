const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const validateFields = require('../middleware/validateFields');
const { applyLeave, getAllLeaves, getMyLeaves, decide } = require('../controllers/leaveController');

router.post('/', auth, validateFields({ type: 100, reason: 2000 }), applyLeave);
router.get('/', auth, role('hr', 'founder'), getAllLeaves);
router.get('/my', auth, getMyLeaves);
router.patch('/:id/decide', auth, role('hr', 'founder'), decide);

module.exports = router;
