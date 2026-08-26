const { createComplaintController } = require('./complaintControllerFactory');

module.exports = createComplaintController({
  collectionName: 'hr_complaints',
  tokenPrefix: 'HR',
  notifyNewComplaintRuleKey: 'hr_new_complaint',
  notifyEmailEnvVar: 'HR_EMAIL',
  notifyStatusUpdateRuleKey: 'hr_status_update',
  editableFields: ['employeeStatus', 'solver', 'remarks', 'employeeId'],
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
