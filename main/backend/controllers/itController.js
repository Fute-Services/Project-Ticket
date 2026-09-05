const { createComplaintController } = require('./complaintControllerFactory');

module.exports = createComplaintController({
  collectionName: 'it_complaints',
  tokenPrefix: 'IT',
  requiredFields: ['category', 'sub_category'],
  notifyNewComplaintRuleKey: 'it_new_complaint',
  notifyEmailEnvVar: 'IT_EMAIL',
  notifyStatusUpdateRuleKey: 'it_status_update',
  // Full field set staff (it/founder/superadmin) can edit via PATCH .../fields.
  editableFields: ['employeeStatus', 'solver', 'remarks', 'vpnNo', 'employeeId', 'description', 'category', 'sub_category', 'priority'],
  // Subset the ticket's own submitter can touch — the Employee Portal's
  // Edit Ticket form (description/category/sub_category/priority) plus
  // employeeStatus, which the ticket queue's "Employee Status" column
  // (TicketsQueueView.jsx) is specifically the requester's own signal about
  // their side of the ticket, not a staff resolution field — its own
  // tooltip already says as much ("Only the employee who raised this ticket
  // can edit Employee Status"), it just wasn't actually allowed here.
  // Resolution/assignment fields (solver/remarks/vpnNo/employeeId) stay
  // staff-only.
  ownerEditableFields: ['description', 'category', 'sub_category', 'priority', 'employeeStatus'],
  staffRole: 'it',
  defaultSolver: 'Unassigned',
  buildDocData: (body, ctx) => {
    let resolvedDepartment = body.department || '';
    if (!resolvedDepartment || resolvedDepartment === 'General') {
      resolvedDepartment = ctx.dbUserData?.department || ctx.dbUserData?.designation || resolvedDepartment;
    }
    return {
      department: resolvedDepartment || body.department || ctx.formattedRole || 'General',
      category: body.category,
      sub_category: body.sub_category,
      approval: body.approval === true || body.approval === 'true',
      vpnNo: body.vpnNo || '',
    };
  },
  buildApprovalRecord: (data, previousStatus, id) => ({
    source: 'IT',
    title: `${data.category} - ${data.sub_category}`,
    sub: data.description,
    requestedBy: data.name,
    priority: data.priority,
    category: data.category,
    complaintRef: { collection: 'it_complaints', id },
    previousStatus,
  }),
});
