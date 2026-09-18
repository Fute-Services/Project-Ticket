const { db } = require('../config/db');
const { UNPAGINATED_READ_LIMIT } = require('../utils/constants');
const { ok, created, fail } = require('../utils/respond');

const recordsCollection = db.collection('productionRecords');
const projectsCollection = db.collection('projects');
const usersCollection = db.collection('users');

const PRODUCTION_STATUSES = ['Not Started', 'Under Production', 'Delivered'];
const INPUTS_STATUSES = ['Pending', 'Partial', 'Complete'];
const CLOSURE_STATUSES = ['Open', 'Closed'];
const BILLING_STATUSES = ['Not Billed', 'Invoice Raised', 'Partially Paid', 'Paid'];

// Coordinator's Production & Delivery Tracker - one row per deliverable
// against a project (a single project can have several: different batches,
// different scopes billed separately). Project/Client Name and Start Date
// are deliberately NOT duplicated here - they're read from the linked
// `projects` doc via projectId, same as tasks already do.

async function validateEmployeeId(id, label, res) {
  const doc = await usersCollection.doc(id).get();
  if (!doc.exists || doc.data().role !== 'employee' || doc.data().active === false) {
    fail(res, { status: 400, message: `${label} must be an active employee account`, code: 'VALIDATION_ERROR' });
    return false;
  }
  return true;
}

async function validateCoordinatorId(id, res) {
  const doc = await usersCollection.doc(id).get();
  if (!doc.exists || !['coordinator', 'founder'].includes(doc.data().role) || doc.data().active === false) {
    fail(res, { status: 400, message: 'pcCoordinatorId must be an active coordinator/founder account', code: 'VALIDATION_ERROR' });
    return false;
  }
  return true;
}

// Shared by create/update - validates the enum + cross-field fields present
// in `body`. Returns true if everything present is valid (sends the error
// response itself and returns false otherwise); does not require every
// field to be present (update sends only what changed).
async function validateFields(body, res, { closureStatusForRule, productionStatusForRule }) {
  if (body.productionStatus !== undefined && !PRODUCTION_STATUSES.includes(body.productionStatus)) {
    fail(res, { status: 400, message: `productionStatus must be one of: ${PRODUCTION_STATUSES.join(', ')}`, code: 'VALIDATION_ERROR' });
    return false;
  }
  if (body.inputsStatus !== undefined && !INPUTS_STATUSES.includes(body.inputsStatus)) {
    fail(res, { status: 400, message: `inputsStatus must be one of: ${INPUTS_STATUSES.join(', ')}`, code: 'VALIDATION_ERROR' });
    return false;
  }
  if (body.closureStatus !== undefined && !CLOSURE_STATUSES.includes(body.closureStatus)) {
    fail(res, { status: 400, message: `closureStatus must be one of: ${CLOSURE_STATUSES.join(', ')}`, code: 'VALIDATION_ERROR' });
    return false;
  }
  if (body.billingStatus !== undefined && !BILLING_STATUSES.includes(body.billingStatus)) {
    fail(res, { status: 400, message: `billingStatus must be one of: ${BILLING_STATUSES.join(', ')}`, code: 'VALIDATION_ERROR' });
    return false;
  }
  if (body.qty !== undefined && !Number.isFinite(body.qty)) {
    fail(res, { status: 400, message: 'qty must be a number', code: 'VALIDATION_ERROR' });
    return false;
  }

  // A record can only be marked Closed once production has actually
  // Delivered - otherwise a coordinator could close out (and stop tracking)
  // something that was never finished. Checks the value that will be true
  // *after* this request applies, whichever of the two fields it's setting.
  const closureStatus = closureStatusForRule;
  const productionStatus = productionStatusForRule;
  if (closureStatus === 'Closed' && productionStatus !== 'Delivered') {
    fail(res, { status: 400, message: 'closureStatus can only be "Closed" once productionStatus is "Delivered"', code: 'VALIDATION_ERROR' });
    return false;
  }

  if (body.assignedPersonId !== undefined && !(await validateEmployeeId(body.assignedPersonId, 'assignedPersonId', res))) return false;
  if (body.pcCoordinatorId !== undefined && !(await validateCoordinatorId(body.pcCoordinatorId, res))) return false;

  return true;
}

// GET /api/coordinator/production-records?projectId=<id> - coordinator/
// founder only (this is a production/billing admin tool, not something an
// individual employee's dashboard surfaces).
async function getProductionRecords(req, res) {
  let query = recordsCollection.limit(UNPAGINATED_READ_LIMIT);
  if (req.query.projectId) query = query.where('projectId', '==', req.query.projectId);
  const snap = await query.get();
  ok(res, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

async function createProductionRecord(req, res) {
  const { projectId, projectCode, scopeOfWork } = req.body;
  if (!projectId || !projectCode || !scopeOfWork) {
    return fail(res, { status: 400, message: 'projectId, projectCode and scopeOfWork are required', code: 'VALIDATION_ERROR' });
  }

  const projectDoc = await projectsCollection.doc(projectId).get();
  if (!projectDoc.exists) {
    return fail(res, { status: 400, message: 'projectId does not exist', code: 'VALIDATION_ERROR' });
  }

  const productionStatus = req.body.productionStatus || 'Not Started';
  const closureStatus = req.body.closureStatus || 'Open';
  if (!(await validateFields(req.body, res, { closureStatusForRule: closureStatus, productionStatusForRule: productionStatus }))) return;

  const docData = {
    projectId,
    projectCode,
    scopeOfWork,
    qty: Number.isFinite(req.body.qty) ? req.body.qty : 0,
    assignedPersonId: req.body.assignedPersonId || '',
    clientPOC: req.body.clientPOC || '',
    productionStatus,
    deliveryDeadline: req.body.deliveryDeadline || '',
    inputsStatus: req.body.inputsStatus || 'Pending',
    pcCoordinatorId: req.body.pcCoordinatorId || '',
    closureStatus,
    actualDeliveryDate: req.body.actualDeliveryDate || '',
    deliveryRemarks: req.body.deliveryRemarks || '',
    outputDriveLink: req.body.outputDriveLink || '',
    billingStatus: req.body.billingStatus || 'Not Billed',
    invoiceNumber: req.body.invoiceNumber || '',
    created_at: new Date().toISOString(),
  };

  const docRef = await recordsCollection.add(docData);
  created(res, { id: docRef.id, ...docData }, 'Production record created successfully');
}

const EDITABLE_FIELDS = [
  'projectCode', 'scopeOfWork', 'qty', 'assignedPersonId', 'clientPOC', 'productionStatus',
  'deliveryDeadline', 'inputsStatus', 'pcCoordinatorId', 'closureStatus', 'actualDeliveryDate',
  'deliveryRemarks', 'outputDriveLink', 'billingStatus', 'invoiceNumber',
];

async function updateProductionRecord(req, res) {
  const { id } = req.params;
  const docRef = recordsCollection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return fail(res, { status: 404, message: 'Production record not found', code: 'NOT_FOUND' });

  const updates = {};
  for (const key of EDITABLE_FIELDS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) return fail(res, { status: 400, message: 'No editable fields provided', code: 'VALIDATION_ERROR' });

  // The closure-vs-production business rule needs the value each field will
  // hold *after* this patch - fall back to the existing doc's value for
  // whichever of the two isn't being changed in this request.
  const closureStatusForRule = updates.closureStatus !== undefined ? updates.closureStatus : doc.data().closureStatus;
  const productionStatusForRule = updates.productionStatus !== undefined ? updates.productionStatus : doc.data().productionStatus;
  if (!(await validateFields(updates, res, { closureStatusForRule, productionStatusForRule }))) return;

  updates.updated_at = new Date().toISOString();
  await docRef.update(updates);
  ok(res, { id, ...doc.data(), ...updates }, { message: 'Production record updated successfully' });
}

module.exports = {
  getProductionRecords,
  createProductionRecord,
  updateProductionRecord,
  PRODUCTION_STATUSES,
  INPUTS_STATUSES,
  CLOSURE_STATUSES,
  BILLING_STATUSES,
};
