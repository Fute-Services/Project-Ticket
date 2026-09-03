const { createComplaintController } = require('./complaintControllerFactory');

module.exports = createComplaintController({
  collectionName: 'hr_complaints',
  tokenPrefix: 'HR',
  notifyNewComplaintRuleKey: 'hr_new_complaint',
  notifyEmailEnvVar: 'HR_EMAIL',
  notifyStatusUpdateRuleKey: 'hr_status_update',
  // description/category/sub_category/priority let the submitter edit their
  // own ticket's content after raising it (Employee Portal's ticket queue
  // - Edit replaces what used to be a Delete-only action there).
  editableFields: ['employeeStatus', 'solver', 'remarks', 'employeeId', 'description', 'category', 'sub_category', 'priority'],
  staffRole: 'hr',
  defaultSolver: 'Unassigned',
  buildDocData: (body) => ({
    category: body.category || 'General',
    sub_category: body.sub_category || 'General',
  }),
  buildApprovalRecord: (data, previousStatus, id) => ({
    source: 'HR',
    title: `HR Request - ${data.name}`,
    sub: data.description,
    requestedBy: data.name,
    priority: data.priority,
    category: 'HR',
    complaintRef: { collection: 'hr_complaints', id },
    previousStatus,
  }),
});
