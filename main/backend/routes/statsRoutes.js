const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { myStats } = require('../controllers/statsController');

// Any logged-in user can see stats for their own tickets
router.get('/me', auth, myStats);

module.exports = router;
