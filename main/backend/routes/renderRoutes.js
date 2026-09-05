const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const { getAllRenders, addRender, updateRender } = require('../controllers/renderController');

// Production logs jobs, IT's Rendering Status view reads the same list —
// reads stay open to any authenticated role, mirrors the original
// shared-context access pattern. Writes are Production/Founder only — this
// used to have no role check at all, so any logged-in account (HR, a
// candidate-facing role, anyone) could create or edit a render job.
router.get('/', auth, getAllRenders);
router.post('/', auth, role('production', 'founder'), addRender);
router.patch('/:id', auth, role('production', 'founder'), updateRender);

module.exports = router;
