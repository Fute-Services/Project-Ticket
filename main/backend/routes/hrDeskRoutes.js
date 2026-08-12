const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const resources = require('../controllers/hrDeskController');

router.post('/send-email', auth, role('hr', 'founder'), resources.sendEmail);
router.get('/send-email', auth, role('hr', 'founder'), resources.getSentEmails);

// Reading the employee roster is also needed outside HR — Coordinators pick
// a real employee as a task's assignee (see coordinator/Tasks.jsx), so this
// one GET is opened to 'coordinator' too. Every other verb on `employees`,
// and every verb on every other HR-desk resource, stays HR/founder-only.
router.get('/employees', auth, role('hr', 'founder', 'coordinator'), resources.employees.list);

for (const [path, handlers] of Object.entries({
  employees: resources.employees,
  candidates: resources.candidates,
  interviews: resources.interviews,
  meetings: resources.meetings,
  attendance: resources.attendance,
  feedback: resources.feedback,
  jobs: resources.jobs,
})) {
  if (path !== 'employees') router.get(`/${path}`, auth, role('hr', 'founder'), handlers.list);
  router.post(`/${path}`, auth, role('hr', 'founder'), handlers.create);
  router.patch(`/${path}/:id`, auth, role('hr', 'founder'), handlers.update);
  router.delete(`/${path}/:id`, auth, role('hr', 'founder'), handlers.remove);
}

module.exports = router;
