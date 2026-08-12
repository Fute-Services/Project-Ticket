const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const resources = require('../controllers/hrDeskController');

router.post('/send-email', auth, role('hr', 'founder'), resources.sendEmail);
router.get('/send-email', auth, role('hr', 'founder'), resources.getSentEmails);

// Every sub-resource here is HR/founder-only — same access as the rest of
// the HR desk (candidates, interviews, meetings, attendance, feedback, jobs).
for (const [path, handlers] of Object.entries({
  employees: resources.employees,
  candidates: resources.candidates,
  interviews: resources.interviews,
  meetings: resources.meetings,
  attendance: resources.attendance,
  feedback: resources.feedback,
  jobs: resources.jobs,
})) {
  router.get(`/${path}`, auth, role('hr', 'founder'), handlers.list);
  router.post(`/${path}`, auth, role('hr', 'founder'), handlers.create);
  router.patch(`/${path}/:id`, auth, role('hr', 'founder'), handlers.update);
  router.delete(`/${path}/:id`, auth, role('hr', 'founder'), handlers.remove);
}

module.exports = router;
