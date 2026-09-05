const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const resources = require('../controllers/hrDeskController');
const { upload, validateFileSignature } = require('../utils/upload');

router.post('/send-email', auth, role('hr', 'founder'), resources.sendEmail);
router.get('/send-email', auth, role('hr', 'founder'), resources.getSentEmails);

// Reading the employee roster is also needed outside HR — Coordinators pick
// a real employee as a task's assignee (see coordinator/Tasks.jsx), so this
// one GET is opened to 'coordinator' too. Every other verb on `employees`,
// and every verb on every other HR-desk resource, stays HR/founder-only.
router.get('/employees', auth, role('hr', 'founder', 'coordinator'), resources.employees.list);

// Self-service Attendance/Check-in — Employee Details module is HR/Founder/
// Employee only (not IT/Production/Coordinator), and each of these only ever
// touches the calling user's own record (see findTodayDoc in the controller).
router.get('/attendance/me/today', auth, role('hr', 'founder', 'employee'), resources.myTodayAttendance);
router.get('/attendance/me', auth, role('hr', 'founder', 'employee'), resources.myAttendanceHistory);
router.post('/attendance/check-in', auth, role('hr', 'founder', 'employee'), resources.checkIn);
router.post('/attendance/check-out', auth, role('hr', 'founder', 'employee'), resources.checkOut);

// Document Template uploads — HR/founder only, matches who can already
// edit an employee record; not opened to 'employee' or any other role.
router.post(
  '/employees/:id/documents/:docType',
  auth,
  role('hr', 'founder'),
  upload.single('file'),
  validateFileSignature,
  resources.uploadEmployeeDocument
);
router.get(
  '/employees/:id/documents/:docType/download',
  auth,
  role('hr', 'founder'),
  resources.downloadEmployeeDocument
);

// Employee's Own Leave & Performance — self-scoped, employeeId always from
// the authenticated session (see myLeaveSummary/myPerformance), never a
// client-supplied id.
router.get('/leave/me', auth, role('hr', 'founder', 'employee'), resources.myLeaveSummary);
router.get('/performance/me', auth, role('hr', 'founder', 'employee'), resources.myPerformance);

// Extra Hours Logging — self-service submit, mirrors Attendance's pattern
// (own employeeId only, never client-supplied). HR/founder see everyone's.
router.get('/extra-hours/me', auth, role('hr', 'founder', 'employee'), resources.myExtraHours);
router.get('/extra-hours/mentions', auth, role('hr', 'founder', 'employee'), resources.myExtraHoursMentions);
router.post('/extra-hours', auth, role('hr', 'founder', 'employee'), resources.submitExtraHours);
router.get('/extra-hours', auth, role('hr', 'founder'), resources.listExtraHours);

// Document Templates — multipart (PDF upload), so create/update go through
// `upload.single('file')` like uploadEmployeeDocument above, not the plain-
// JSON loop below.
router.get('/document-templates', auth, role('hr', 'founder'), resources.documentTemplates.list);
router.post('/document-templates', auth, role('hr', 'founder'), upload.single('file'), validateFileSignature, resources.documentTemplates.create);
router.patch('/document-templates/:id', auth, role('hr', 'founder'), upload.single('file'), validateFileSignature, resources.documentTemplates.update);
router.delete('/document-templates/:id', auth, role('hr', 'founder'), resources.documentTemplates.remove);
router.get('/document-templates/:id/download', auth, role('hr', 'founder'), resources.documentTemplates.download);

for (const [path, handlers] of Object.entries({
  employees: resources.employees,
  candidates: resources.candidates,
  interviews: resources.interviews,
  meetings: resources.meetings,
  attendance: resources.attendance,
  feedback: resources.feedback,
  jobs: resources.jobs,
  performance: resources.performance,
  'leave-entries': resources.leaveEntries,
})) {
  if (path !== 'employees') router.get(`/${path}`, auth, role('hr', 'founder'), handlers.list);
  // Attendance is written exclusively through /attendance/check-in and
  // /attendance/check-out above (each employee's own record only) — HR gets
  // read-only access here, no create/update, so there's no path for HR to
  // mark or edit anyone's attendance by hand. Delete stays available for
  // removing a genuinely bad record, which isn't "editing" attendance.
  if (path !== 'attendance') {
    router.post(`/${path}`, auth, role('hr', 'founder'), handlers.create);
    router.patch(`/${path}/:id`, auth, role('hr', 'founder'), handlers.update);
  }
  router.delete(`/${path}/:id`, auth, role('hr', 'founder'), handlers.remove);
}

module.exports = router;
