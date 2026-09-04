const { createComplaintController } = require('./complaintControllerFactory');

module.exports = createComplaintController({
  collectionName: 'hr_complaints',
  tokenPrefix: 'HR',
  notifyNewComplaintRuleKey: 'hr_new_complaint',
  notifyEmailEnvVar: 'HR_EMAIL',
  notifyStatusUpdateRuleKey: 'hr_status_update',
  // Full field set staff (hr/founder/superadmin) can edit via PATCH .../fields.
  editableFields: ['employeeStatus', 'solver', 'remarks', 'employeeId', 'description', 'category', 'sub_category', 'priority'],
  // Subset the ticket's own submitter can touch — exactly what the
  // Employee Portal's Edit Ticket form sends (EditTicketModal.jsx via
  // TicketContext.editTicket). Resolution/assignment fields
  // (employeeStatus/solver/remarks/employeeId) stay staff-only.
  ownerEditableFields: ['description', 'category', 'sub_category', 'priority'],
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
