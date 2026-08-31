const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const { uploadSpreadsheet } = require('../utils/upload');
const resources = require('../controllers/salesDeskController');

// Sales Desk — 'sales' and 'founder' only (mirrors HR Desk's own hr/founder
// gate). Not opened to 'hr' — this is a separate desk that happens to reuse
// HR's backend patterns, not part of the HR module itself.
router.get('/leads', auth, role('sales', 'founder'), resources.listLeads);
router.post('/leads', auth, role('sales', 'founder'), resources.createLead);
router.patch('/leads/:id', auth, role('sales', 'founder'), resources.updateLead);
router.delete('/leads/:id', auth, role('sales', 'founder'), resources.deleteLead);
router.post('/leads/:id/log-call', auth, role('sales', 'founder'), resources.logCall);

router.post('/leads/import', auth, role('sales', 'founder'), uploadSpreadsheet.single('file'), resources.importLeads);
router.get('/email-campaign/export', auth, role('sales', 'founder'), resources.exportEmailCampaign);

router.get('/settings', auth, role('sales', 'founder'), resources.getSettings);
router.patch('/settings', auth, role('sales', 'founder'), resources.updateSettings);

router.get('/campaigns', auth, role('sales', 'founder'), resources.listCampaigns);
router.post('/campaigns', auth, role('sales', 'founder'), resources.createCampaign);
router.delete('/campaigns/:id', auth, role('sales', 'founder'), resources.deleteCampaign);

module.exports = router;
