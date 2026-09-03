const { createComplaintController } = require('./complaintControllerFactory');

module.exports = createComplaintController({
  collectionName: 'it_complaints',
  tokenPrefix: 'IT',
  requiredFields: ['category', 'sub_category'],
  notifyNewComplaintRuleKey: 'it_new_complaint',
  notifyEmailEnvVar: 'IT_EMAIL',
  notifyStatusUpdateRuleKey: 'it_status_update',
  // description/category/sub_category/priority let the submitter edit their
  // own ticket's content after raising it (Employee Portal's ticket queue
  // - Edit replaces what used to be a Delete-only action there).
  editableFields: ['employeeStatus', 'solver', 'remarks', 'vpnNo', 'employeeId', 'description', 'category', 'sub_category', 'priority'],
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
