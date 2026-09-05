const { createComplaintController } = require('./complaintControllerFactory');

module.exports = createComplaintController({
  collectionName: 'hr_complaints',
  tokenPrefix: 'HR',
  notifyNewComplaintRuleKey: 'hr_new_complaint',
  notifyEmailEnvVar: 'HR_EMAIL',
  notifyStatusUpdateRuleKey: 'hr_status_update',
  // Full field set staff (hr/founder/superadmin) can edit via PATCH .../fields.
  editableFields: ['employeeStatus', 'solver', 'remarks', 'employeeId', 'description', 'category', 'sub_category', 'priority'],
  // Subset the ticket's own submitter can touch — the Employee Portal's
  // Edit Ticket form (description/category/sub_category/priority) plus
  // employeeStatus, which the ticket queue's "Employee Status" column
  // (TicketsQueueView.jsx) is specifically the requester's own signal about
  // their side of the ticket, not a staff resolution field — its own
  // tooltip already says as much ("Only the employee who raised this ticket
  // can edit Employee Status"), it just wasn't actually allowed here.
  // Resolution/assignment fields (solver/remarks/employeeId) stay staff-only.
  ownerEditableFields: ['description', 'category', 'sub_category', 'priority', 'employeeStatus'],
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
