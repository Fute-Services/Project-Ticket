const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getAllRenders, addRender, updateRender } = require('../controllers/renderController');

// Production logs jobs, IT's Rendering Status view reads the same list —
// no role restriction, mirrors the original shared-context access pattern.
router.get('/', auth, getAllRenders);
router.post('/', auth, addRender);
router.patch('/:id', auth, updateRender);

module.exports = router;
