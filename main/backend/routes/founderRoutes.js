const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const { getAllComplaints } = require('../controllers/founderController');

router.get('/complaints', auth, role('founder'), getAllComplaints);

module.exports = router;
