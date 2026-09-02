const { db, bucket } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');
const { UNPAGINATED_READ_LIMIT } = require('../utils/constants');
const { sendMail, escapeHtml } = require('../utils/mailer');
const { ok, created, fail } = require('../utils/respond');

const sentCollection = db.collection('sent_emails');
const approvalsCollection = db.collection('approvals');

// Decision (documented, not silently assumed): Payel/Soma/Ratish are
// modeled as roles, not named accounts — the app has no named-approver
// concept, and building one is materially bigger than this feature.
// Any 'hr' user can decide a 'document'/'extra-hours' approval; the
// Founder is always emailed on both creation and decision either way, so
// nothing HR does here is invisible to them.
async function notifyFounder(subject, html) {
  try {
    const snap = await db.collection('users').where('role', '==', 'founder').limit(5).get();
    await Promise.all(snap.docs.map((d) => sendMail(d.data().email, subject, html).catch(() => {})));
  } catch (e) {
    console.error('Failed to notify founder:', e.message);
  }
}

// POST /api/hr-desk/send-email — { to, subject, body } — actually sends via
// the same SMTP transport complaint notifications use, then keeps a record
// so the Sent folder reflects real history across sessions/devices.
async function sendEmail(req, res) {
  const { to, subject, body } = req.body;
  if (!to || !subject || !body) return fail(res, { status: 400, message: 'to, subject and body are required', code: 'VALIDATION_ERROR' });

  const html = `<div style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(body)}</div>`;
  try {
    await sendMail(to, subject, html);
  } catch (err) {
    return fail(res, { status: 502, message: 'Failed to send email', code: 'EMAIL_SEND_FAILED' });
  }

  const docData = {
    to,
    subject,
    preview: body.slice(0, 80),
    body,
    sentBy: req.user.full_name,
    time: new Date().toISOString(),
  };
  const docRef = await sentCollection.add(docData);
  created(res, { id: docRef.id, ...docData }, 'Email sent successfully');
}

// GET /api/hr-desk/send-email — Sent folder history. No `.orderBy('time')`
// on the query itself — see the comment in makeCrud's list() below for why.
async function getSentEmails(req, res) {
  const snap = await sentCollection.limit(UNPAGINATED_READ_LIMIT).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
  ok(res, rows);
}

// Firestore Timestamp fields (e.g. candidates.appliedOn) come back from
// `.data()` as Timestamp instances, which JSON.stringify mangles into a raw
// {_seconds,_nanoseconds} object — convert them to ISO strings so API
// responses stay plain JSON.
function serializeDoc(data) {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = value && typeof value.toDate === 'function' ? value.toDate().toISOString() : value;
  }
  return out;
}

// Six HR sub-resources (Candidates, Interviews, Meetings, Attendance,
// Feedback, Job postings) share the same shape of CRUD — list/create/
// update/delete against one Firestore collection, no cross-resource logic —
// so one factory replaces six near-identical controllers. `options.transforms`
// converts a field's incoming value before it's stored (e.g. a date string
// into a Firestore Timestamp); `options.trackUpdatedBy` stamps who made the
// change; `options.afterWrite` runs a side effect after a create/update
// (e.g. candidates.nextInterview needs updating whenever an interview is
// scheduled) without pulling that cross-resource logic into every resource.
function makeCrud(collectionName, requiredFields, editableFields, options = {}) {
  const { transforms = {}, trackUpdatedBy = false, afterWrite } = options;
  const collection = db.collection(collectionName);

  async function list(req, res) {
    // No `.orderBy('created_at')` here on purpose — Firestore silently
    // drops any document missing the ordered field from the result set
    // entirely, which was hiding every legacy/manually-added record (e.g.
    // employees added before this field was set consistently, or created
    // directly in the Firestore console). Sorting in JS after the fetch
    // keeps the same bounded read (.limit(UNPAGINATED_READ_LIMIT)) without excluding anyone —
    // docs with no created_at just sort to the end instead of vanishing.
    const snap = await collection.limit(UNPAGINATED_READ_LIMIT).get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) }));
    rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    ok(res, rows);
  }

  async function create(req, res) {
    for (const field of requiredFields) {
      if (!req.body[field]) return fail(res, { status: 400, message: `${field} is required`, code: 'VALIDATION_ERROR' });
    }
    const docData = { created_at: new Date().toISOString() };
    if (trackUpdatedBy) docData.lastUpdatedBy = req.user.full_name;
    for (const key of editableFields) {
      if (req.body[key] !== undefined) docData[key] = transforms[key] ? transforms[key](req.body[key]) : req.body[key];
    }
    const docRef = await collection.add(docData);
    if (afterWrite) await afterWrite(docData);
    created(res, { id: docRef.id, ...serializeDoc(docData) }, 'Created successfully');
  }

  async function update(req, res) {
    const { id } = req.params;
    const docRef = collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return fail(res, { status: 404, message: 'Not found', code: 'NOT_FOUND' });

    const updates = { updated_at: new Date().toISOString() };
    if (trackUpdatedBy) updates.lastUpdatedBy = req.user.full_name;
    for (const key of editableFields) {
      if (req.body[key] !== undefined) updates[key] = transforms[key] ? transforms[key](req.body[key]) : req.body[key];
    }
    await docRef.update(updates);
    const merged = { ...doc.data(), ...updates };
    if (afterWrite) await afterWrite(merged);
    ok(res, { id, ...serializeDoc(merged) }, { message: 'Updated successfully' });
  }

  async function remove(req, res) {
    const { id } = req.params;
    const docRef = collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return fail(res, { status: 404, message: 'Not found', code: 'NOT_FOUND' });
    await docRef.delete();
    ok(res, { id }, { message: 'Deleted successfully' });
  }

  return { list, create, update, remove };
}

// Keeps candidates.nextInterview (the denormalized summary used by the
// candidates list view, so it doesn't need a per-candidate interviews query)
// in sync whenever an interview is scheduled/rescheduled. Best-effort: a
// missing/deleted candidate shouldn't fail the interview write itself.
async function syncNextInterview(interview) {
  if (!interview.candidateId || interview.status === 'Cancelled') return;
  await db
    .collection('candidates')
    .doc(interview.candidateId)
    .update({ nextInterview: { date: interview.date, type: interview.type, interviewer: interview.interviewer } })
    .catch(() => {});
}

// Document Template module (§7 of the requirements doc) — full names shown
// to HR, not the shorthand from the original notes (OL/NDA/LP/COC). Each
// entry names the two employee-doc fields it owns (a Storage download URL +
// the original filename), so uploadEmployeeDocument and the employees
// editableFields list both stay in sync with this one map.
const DOCUMENT_TYPES = {
  olSigned: { label: 'Offer Letter (Signed)', urlField: 'olSignedUrl', fileNameField: 'olSignedFileName' },
  nda: { label: 'Non-Disclosure Agreement (NDA)', urlField: 'ndaUrl', fileNameField: 'ndaFileName' },
  leavePolicy: { label: 'Leave Policy (Acknowledged)', urlField: 'leavePolicyUrl', fileNameField: 'leavePolicyFileName' },
  coc: { label: 'Code of Conduct (COC)', urlField: 'cocUrl', fileNameField: 'cocFileName' },
  oldAppointmentLetter: { label: 'Old Appointment Letter', urlField: 'oldAppointmentLetterUrl', fileNameField: 'oldAppointmentLetterFileName' },
  relievingLetter: { label: 'Relieving Letter', urlField: 'relievingLetterUrl', fileNameField: 'relievingLetterFileName' },
  aadharCard: { label: 'Aadhar Card', urlField: 'aadharCardUrl', fileNameField: 'aadharCardFileName' },
  panCard: { label: 'PAN Card', urlField: 'panCardUrl', fileNameField: 'panCardFileName' },
  voterIdCard: { label: 'Voter ID', urlField: 'voterIdCardUrl', fileNameField: 'voterIdCardFileName' },
  driveLinkDoc: { label: 'Drive Link Document', urlField: 'driveLinkDocUrl', fileNameField: 'driveLinkDocFileName' },
  // Free slots for whatever doesn't fit the named types above (e.g. a
  // certification, a reference letter) - 3 rather than an open-ended list
  // since employees still stores these as flat fields (urlField/
  // fileNameField), not an array.
  other1: { label: 'Other Document 1', urlField: 'other1Url', fileNameField: 'other1FileName' },
  other2: { label: 'Other Document 2', urlField: 'other2Url', fileNameField: 'other2FileName' },
  other3: { label: 'Other Document 3', urlField: 'other3Url', fileNameField: 'other3FileName' },
};

// POST /api/hr-desk/employees/:id/documents/:docType — HR/founder only
// (enforced in the route). Uploads straight to Firebase Storage (no local
// disk write — multer's memoryStorage), then stores a long-lived signed
// read URL + the original filename on the employee doc, matching the two
// fields DOCUMENT_TYPES declares for this docType.
async function uploadEmployeeDocument(req, res) {
  const { id, docType } = req.params;
  const doc = DOCUMENT_TYPES[docType];
  if (!doc) return fail(res, { status: 400, message: `Unknown document type "${docType}"`, code: 'VALIDATION_ERROR' });
  if (!req.file) return fail(res, { status: 400, message: 'No file uploaded', code: 'VALIDATION_ERROR' });
  if (!bucket) return fail(res, { status: 503, message: 'File storage is not configured on this server', code: 'SERVICE_UNAVAILABLE' });

  const employeeRef = db.collection('employees').doc(id);
  if (!(await employeeRef.get()).exists) return fail(res, { status: 404, message: 'Employee not found', code: 'NOT_FOUND' });

  const safeName = req.file.originalname.replace(/[^\w.\-]/g, '_');
  const storagePath = `employee-documents/${id}/${docType}-${Date.now()}-${safeName}`;
  const blob = bucket.file(storagePath);
  let url;
  try {
    await blob.save(req.file.buffer, { contentType: req.file.mimetype });
    // 50-year expiry — internal HR documents behind an unguessable signed
    // URL, not meant to be re-signed on every view like a short-lived link.
    [url] = await blob.getSignedUrl({ action: 'read', expires: '01-01-2075' });
  } catch (e) {
    // The Google Cloud Storage client sets its own `.status`/`.message` on
    // this error (often the raw API error body as a JSON string) — without
    // catching it here, server.js's global handler trusts that `.status`
    // as if it were our own intentional one and shows that raw JSON
    // straight to the user instead of a readable message.
    console.error('Storage upload failed:', e.message);
    throw Object.assign(new Error('Could not upload the file — file storage is not configured correctly. Ask an admin to check the Storage bucket setup.'), { status: 502 });
  }

  const updates = { [doc.urlField]: url, [doc.fileNameField]: req.file.originalname };
  await employeeRef.update(updates);

  // Approval record — the document is already live (see the security-tier
  // note in the build plan: gating the live field itself on approval would
  // block HR from working with a doc while sign-off is pending, which is a
  // worse trade for an internal tool). This is the sign-off/visibility
  // trail: any 'hr' or 'founder' user can decide it, and the Founder is
  // emailed on both creation and decision either way.
  const employeeData = (await employeeRef.get()).data();
  const approvalDoc = {
    source: 'HR',
    category: 'document',
    title: `${doc.label} — ${employeeData.name}`,
    sub: req.file.originalname,
    requestedBy: req.user.full_name,
    priority: 'medium',
    status: 'pending_founder',
    employeeId: id,
    docType,
    remarks: [],
    createdAt: new Date().toISOString(),
  };
  const approvalRef = await approvalsCollection.add(approvalDoc);

  await notifyFounder(
    `Document uploaded — ${doc.label} for ${employeeData.name}`,
    `<p>${escapeHtml(req.user.full_name)} uploaded <strong>${escapeHtml(doc.label)}</strong> for <strong>${escapeHtml(employeeData.name)}</strong>. Awaiting sign-off.</p>`
  );

  ok(res, { id, ...updates, approvalId: approvalRef.id }, { message: 'Document uploaded successfully' });
}

// Reusable blank document templates (Offer Letter, Relieving Letter, ...)
// HR uploads once and reuses per new joiner/exiting employee - distinct from
// uploadEmployeeDocument above, which stores a *specific* employee's already-
// signed copy, not the blank template itself. Uploads straight to Firebase
// Storage (memoryStorage multer, see utils/upload.js), same pattern as
// uploadEmployeeDocument - not run through makeCrud since that only handles
// JSON bodies, not multipart file uploads.
const documentTemplatesCollection = db.collection('document_templates');

async function createDocumentTemplate(req, res) {
  const { name, category } = req.body;
  if (!name || !category) return fail(res, { status: 400, message: 'name and category are required', code: 'VALIDATION_ERROR' });
  if (!req.file) return fail(res, { status: 400, message: 'A PDF file is required', code: 'VALIDATION_ERROR' });
  if (!bucket) return fail(res, { status: 503, message: 'File storage is not configured on this server', code: 'SERVICE_UNAVAILABLE' });

  const safeName = req.file.originalname.replace(/[^\w.\-]/g, '_');
  const storagePath = `document-templates/${category}/${Date.now()}-${safeName}`;
  const blob = bucket.file(storagePath);
  let url;
  try {
    await blob.save(req.file.buffer, { contentType: req.file.mimetype });
    // 50-year expiry — same call as uploadEmployeeDocument's, an internal
    // template behind an unguessable signed URL, not re-signed per view.
    [url] = await blob.getSignedUrl({ action: 'read', expires: '01-01-2075' });
  } catch (e) {
    console.error('Storage upload failed:', e.message);
    throw Object.assign(new Error('Could not upload the file — file storage is not configured correctly. Ask an admin to check the Storage bucket setup.'), { status: 502 });
  }

  const docData = {
    name,
    category,
    fileUrl: url,
    fileName: req.file.originalname,
    created_at: new Date().toISOString(),
  };
  const docRef = await documentTemplatesCollection.add(docData);
  created(res, { id: docRef.id, ...docData }, 'Template added');
}

async function updateDocumentTemplate(req, res) {
  const { id } = req.params;
  const docRef = documentTemplatesCollection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return fail(res, { status: 404, message: 'Not found', code: 'NOT_FOUND' });

  const updates = { updated_at: new Date().toISOString() };
  if (req.body.name) updates.name = req.body.name;
  if (req.body.category) updates.category = req.body.category;

  // A new file is optional on edit — renaming a template or moving it
  // between Joining/Exit shouldn't force re-uploading the same PDF.
  if (req.file) {
    if (!bucket) return fail(res, { status: 503, message: 'File storage is not configured on this server', code: 'SERVICE_UNAVAILABLE' });
    const safeName = req.file.originalname.replace(/[^\w.\-]/g, '_');
    const storagePath = `document-templates/${updates.category || doc.data().category}/${Date.now()}-${safeName}`;
    const blob = bucket.file(storagePath);
    try {
      await blob.save(req.file.buffer, { contentType: req.file.mimetype });
      const [url] = await blob.getSignedUrl({ action: 'read', expires: '01-01-2075' });
      updates.fileUrl = url;
      updates.fileName = req.file.originalname;
    } catch (e) {
      console.error('Storage upload failed:', e.message);
      throw Object.assign(new Error('Could not upload the file — file storage is not configured correctly. Ask an admin to check the Storage bucket setup.'), { status: 502 });
    }
  }

  await docRef.update(updates);
  ok(res, { id, ...doc.data(), ...updates }, { message: 'Template updated successfully' });
}

const attendanceCollection = db.collection('attendance');
const DEFAULT_LEAVE_ENTITLEMENT = 24; // matches Directory.jsx's default (kept in sync manually — same value, different file)

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Self-service check-in/out (Employee Details → Attendance module) always
// resolves the record via req.user.employeeId, never a client-supplied id —
// so one employee's session can only ever touch their own attendance row,
// even though the underlying `attendance` collection is otherwise HR/founder
// -only to write. A single-doc lookup (employeeId + today), not a collection
// scan, so this stays cheap however large `attendance` grows.
async function findDocForDate(employeeId, date) {
  const snap = await attendanceCollection
    .where('employeeId', '==', employeeId)
    .where('date', '==', date)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0];
}
const findTodayDoc = (employeeId) => findDocForDate(employeeId, todayStr());

// Inclusive list of "YYYY-MM-DD" strings from `from` to `to` — used to turn
// a Leave date range into one attendance row per day. Capped at 60 days so
// a typo'd year in the "To" field can't silently create thousands of rows.
function dateRange(from, to) {
  const dates = [];
  let cur = new Date(from);
  const end = new Date(to);
  while (cur <= end && dates.length < 60) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// GET /api/hr-desk/attendance/me/today — lets the Check-in/Check-out widget
// know on load whether the current user is already checked in, without
// pulling the whole attendance collection like the HR-side list() does.
async function myTodayAttendance(req, res) {
  if (!req.user.employeeId) return ok(res, null);
  const doc = await findTodayDoc(req.user.employeeId);
  ok(res, doc ? { id: doc.id, ...doc.data() } : null);
}

// GET /api/hr-desk/attendance/me — an employee's own attendance history
// (for the Performance page's Extra Hours card). Same self-only scoping as
// findTodayDoc: keyed off req.user.employeeId, never a client-supplied id.
async function myAttendanceHistory(req, res) {
  if (!req.user.employeeId) return ok(res, []);
  const snap = await attendanceCollection
    .where('employeeId', '==', req.user.employeeId)
    .limit(UNPAGINATED_READ_LIMIT)
    .get();
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  ok(res, data.sort((a, b) => String(b.date).localeCompare(String(a.date))));
}

// POST /api/hr-desk/attendance/check-in — workMode 'Leave' marks the whole
// day as leave (no check-in time/timer, just a status), self-declared from
// the same widget as Office/WFH check-in — no separate approval step. This
// is the one and only place attendance.status can become 'Leave', so a
// leave-taken count anywhere else (Directory's Employee Profile) can trust
// counting these rows directly instead of re-deriving it some other way.
async function checkIn(req, res) {
  if (!req.user.employeeId) {
    return fail(res, { status: 400, message: 'Your account is not linked to an employee record yet — ask HR to set that up.', code: 'VALIDATION_ERROR' });
  }
  const workMode = ['WFH', 'Leave'].includes(req.body.workMode) ? req.body.workMode : 'Office';
  const existing = await findTodayDoc(req.user.employeeId);
  if (existing && existing.data().checkIn && existing.data().checkIn !== '-' && (!existing.data().checkOut || existing.data().checkOut === '-')) {
    return fail(res, { status: 409, message: 'Already checked in for today.', code: 'CONFLICT' });
  }

  if (workMode === 'Leave') {
    // Date range + reason (decided: extend this same self-service flow
    // rather than a separate leave_requests system) — `toDate` defaults to
    // today for a same-day leave, matching the original single-day toggle.
    const fromDate = todayStr();
    const toDate = req.body.toDate && req.body.toDate >= fromDate ? req.body.toDate : fromDate;
    const reason = (req.body.reason || '').trim();
    const dates = dateRange(fromDate, toDate);

    const rows = await Promise.all(
      dates.map(async (date) => {
        const docData = { employeeId: req.user.employeeId, date, status: 'Leave', checkIn: '-', checkOut: '-', hours: null, workMode: 'Leave', reason };
        const doc = date === fromDate ? existing : await findDocForDate(req.user.employeeId, date);
        if (doc) {
          await doc.ref.update(docData);
          return { id: doc.id, ...docData };
        }
        const docRef = await attendanceCollection.add(docData);
        return { id: docRef.id, ...docData };
      })
    );
    return created(res, rows[0], 'Leave marked successfully');
  }

  // "HH:MM" (not a full timestamp) — matches the format Attendance.jsx's
  // workingHours() already parses, so self-check-in stays compatible with
  // however else this collection's rows get read.
  const checkInTime = new Date().toTimeString().slice(0, 5);
  if (existing) {
    await existing.ref.update({ checkIn: checkInTime, checkOut: '-', status: 'Present', workMode });
    return ok(res, { id: existing.id, ...existing.data(), checkIn: checkInTime, checkOut: '-', status: 'Present', workMode }, { message: 'Checked in successfully' });
  }
  const docData = { employeeId: req.user.employeeId, date: todayStr(), status: 'Present', checkIn: checkInTime, checkOut: '-', hours: null, workMode };
  const docRef = await attendanceCollection.add(docData);
  created(res, { id: docRef.id, ...docData }, 'Checked in successfully');
}

// POST /api/hr-desk/attendance/check-out
async function checkOut(req, res) {
  if (!req.user.employeeId) {
    return fail(res, { status: 400, message: 'Your account is not linked to an employee record yet — ask HR to set that up.', code: 'VALIDATION_ERROR' });
  }
  const doc = await findTodayDoc(req.user.employeeId);
  if (!doc || !doc.data().checkIn || doc.data().checkIn === '-') {
    return fail(res, { status: 409, message: 'You have not checked in today.', code: 'CONFLICT' });
  }
  if (doc.data().checkOut && doc.data().checkOut !== '-') {
    return fail(res, { status: 409, message: 'Already checked out for today.', code: 'CONFLICT' });
  }

  const checkOutTime = new Date().toTimeString().slice(0, 5);
  const [inH, inM] = doc.data().checkIn.split(':').map(Number);
  const [outH, outM] = checkOutTime.split(':').map(Number);
  const hours = Math.max(0, (outH * 60 + outM - (inH * 60 + inM)) / 60);
  await doc.ref.update({ checkOut: checkOutTime, hours });
  ok(res, { id: doc.id, ...doc.data(), checkOut: checkOutTime, hours }, { message: 'Checked out successfully' });
}

// Extra Hours Logging module — self-service submit (mirrors checkIn's
// pattern: employeeId always comes from req.user.employeeId, never a
// client-supplied one), approved through the same 'approvals' collection
// as Document Template (category 'extra-hours') but — unlike documents —
// decided by the Founder only, not HR (see HR_DECIDABLE_CATEGORIES in
// approvalController.js). On approval, the linked extra_hours doc's status
// is synced too, which is what Directory.jsx's "Extra Hours: Xh approved"
// total actually counts.
const extraHoursCollection = db.collection('extra_hours');

async function submitExtraHours(req, res) {
  if (!req.user.employeeId) {
    return fail(res, { status: 400, message: 'Your account is not linked to an employee record yet — ask HR to set that up.', code: 'VALIDATION_ERROR' });
  }
  const { projectCode, hours, date, fromTime, toTime, teammates } = req.body;
  if (!projectCode || !hours || !date) {
    return fail(res, { status: 400, message: 'projectCode, hours and date are required', code: 'VALIDATION_ERROR' });
  }

  const employeeDoc = await db.collection('employees').doc(req.user.employeeId).get();
  const employeeName = employeeDoc.exists ? employeeDoc.data().name : req.user.full_name;

  const docData = {
    employeeId: req.user.employeeId,
    // Kept alongside `employeeId` so a teammate's mention notification
    // (myExtraHoursMentions below) can show a name without a second lookup
    // — `employeeId` alone only identifies the *owner*, not who logged it.
    loggedBy: employeeName,
    projectCode,
    hours: Number(hours) || 0,
    date,
    fromTime: fromTime || '',
    toTime: toTime || '',
    teammates: Array.isArray(teammates) ? teammates : [],
    status: 'pending_founder',
    createdAt: new Date().toISOString(),
  };
  const docRef = await extraHoursCollection.add(docData);

  const teammatesLine = docData.teammates.length ? ` · with ${docData.teammates.join(', ')}` : '';
  const approvalDoc = {
    source: 'HR',
    category: 'extra-hours',
    title: `Extra hours — ${employeeName} (${projectCode})`,
    sub: `${docData.hours}h on ${date}${teammatesLine}`,
    requestedBy: req.user.full_name,
    priority: 'medium',
    status: 'pending_founder',
    employeeId: req.user.employeeId,
    extraHoursId: docRef.id,
    remarks: [],
    createdAt: docData.createdAt,
  };
  const approvalRef = await approvalsCollection.add(approvalDoc);
  await extraHoursCollection.doc(docRef.id).update({ approvalId: approvalRef.id });

  await notifyFounder(
    `Extra hours submitted — ${employeeName}`,
    `<p><strong>${escapeHtml(employeeName)}</strong> logged <strong>${docData.hours}h</strong> on project <strong>${escapeHtml(projectCode)}</strong> (${escapeHtml(date)}). Awaiting sign-off.</p>` +
    (docData.teammates.length
      ? `<p>Also worked on this with: <strong>${escapeHtml(docData.teammates.join(', '))}</strong></p>`
      : '')
  );

  created(res, { id: docRef.id, ...docData, approvalId: approvalRef.id }, 'Extra hours submitted successfully');
}

// GET /api/hr-desk/extra-hours/me — the calling employee's own entries only.
async function myExtraHours(req, res) {
  if (!req.user.employeeId) return ok(res, []);
  const snap = await extraHoursCollection
    .where('employeeId', '==', req.user.employeeId)
    .limit(UNPAGINATED_READ_LIMIT)
    .get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  ok(res, rows);
}

// GET /api/hr-desk/extra-hours/mentions — entries where someone named the
// calling employee as a teammate ("Any other teammates along with me" on
// the log form) — matched by name since that field is free text, not a
// picker over real employee/user records. Powers the "X included you"
// notification on the employee dashboard (useEmployeeNotifications.js).
async function myExtraHoursMentions(req, res) {
  const myName = (req.user.full_name || '').trim().toLowerCase();
  if (!myName) return ok(res, []);
  const snap = await extraHoursCollection.limit(UNPAGINATED_READ_LIMIT).get();
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => (r.teammates || []).some((t) => (t || '').trim().toLowerCase() === myName));
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  ok(res, rows);
}

// GET /api/hr-desk/extra-hours — HR/founder, every employee's entries
// (bounded, same UNPAGINATED_READ_LIMIT convention as the rest of HR desk).
async function listExtraHours(req, res) {
  const snap = await extraHoursCollection.limit(UNPAGINATED_READ_LIMIT).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  ok(res, rows);
}

// "Taken" is stored one row per (employeeId, periodKey) in leave_entries —
// same shape as performance_entries — so HR can set a different taken count
// per month/quarter (mirrors Directory.jsx's Performance card). Total always
// stays the employee's leaveEntitlement; Remaining is entitlement minus the
// sum of taken across every period on file, not just the one being viewed.
const leaveEntriesCollection = db.collection('leave_entries');

// GET /api/hr-desk/leave/me — self-scoped leave summary (Employee's Own
// Leave & Performance gap), plus the raw per-period entries so the employee
// can also pick a month/quarter and see that period's taken count.
async function myLeaveSummary(req, res) {
  if (!req.user.employeeId) return ok(res, { entitlement: 0, takenYear: 0, remaining: 0, entries: [] });
  const [empDoc, entriesSnap] = await Promise.all([
    db.collection('employees').doc(req.user.employeeId).get(),
    leaveEntriesCollection.where('employeeId', '==', req.user.employeeId).limit(UNPAGINATED_READ_LIMIT).get(),
  ]);
  const entitlement = Number(empDoc.exists ? empDoc.data().leaveEntitlement : 0) || DEFAULT_LEAVE_ENTITLEMENT;
  const entries = entriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const takenYear = entries.reduce((s, e) => s + (Number(e.taken) || 0), 0);
  ok(res, { entitlement, takenYear, remaining: Math.max(0, entitlement - takenYear), entries });
}

// GET /api/hr-desk/performance/me — self-scoped, mirrors myLeaveSummary.
async function myPerformance(req, res) {
  if (!req.user.employeeId) return ok(res, []);
  const snap = await db
    .collection('performance_entries')
    .where('employeeId', '==', req.user.employeeId)
    .limit(UNPAGINATED_READ_LIMIT)
    .get();
  ok(res, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

module.exports = {
  sendEmail,
  getSentEmails,
  myLeaveSummary,
  myPerformance,
  submitExtraHours,
  myExtraHours,
  myExtraHoursMentions,
  listExtraHours,
  // list/remove reuse makeCrud's plain-JSON versions; create/update are the
  // multipart-upload functions above (file uploads aren't JSON bodies).
  documentTemplates: {
    ...makeCrud('document_templates', ['name', 'category'], ['name', 'category']),
    create: createDocumentTemplate,
    update: updateDocumentTemplate,
  },
  employees: makeCrud('employees', ['name', 'department'],
    ['name', 'department', 'designation', 'status', 'email', 'phone', 'manager', 'joiningDate',
      'employmentType', 'probationCompletionDate',
      'empCode', 'biometricVpnNumber', 'accountNumber', 'salary', 'emergencyContact',
      'emergencyContactRelation', 'personalEmail', 'dob', 'bloodGroup', 'permanentAddress',
      'presentAddress', 'aadharNumber', 'panDetails', 'voterId', 'driveLink', 'bgVerification',
      'leaveEntitlement', 'uan',
      ...Object.values(DOCUMENT_TYPES).flatMap((d) => [d.urlField, d.fileNameField])]),
  uploadEmployeeDocument,
  candidates: makeCrud('candidates', ['name', 'email'],
    ['name', 'email', 'phone', 'location', 'skills', 'secondarySkills', 'experience', 'relevantExperience',
      'education', 'currentCTC', 'expectedSalary', 'noticePeriod', 'currentCompany', 'portfolio', 'source',
      'stage', 'appliedFor', 'appliedOn', 'resumeFileName', 'resumeUrl', 'resumeLink', 'resumeDate',
      'rejectionReason', 'assignedRecruiter', 'nextInterview',
      'hrScreeningStatus', 'payelFeedback', 'shortlisted', 'technicalRoundDate', 'technicalRoundStatus',
      'finalDecision', 'workMode', 'remarks', 'lastFollowUpDate', 'outputPath'],
    { transforms: { appliedOn: (v) => (v ? Timestamp.fromDate(new Date(v)) : v) }, trackUpdatedBy: true }),
  interviews: makeCrud('interviews', ['candidate', 'type', 'date'],
    ['candidateId', 'candidate', 'type', 'interviewer', 'date', 'time', 'link', 'location', 'notes', 'status'],
    { afterWrite: syncNextInterview }),
  meetings: makeCrud('meetings', ['title', 'date'],
    ['title', 'type', 'agenda', 'participants', 'date', 'time', 'notes']),
  attendance: makeCrud('attendance', ['employeeId', 'date', 'status'],
    ['employeeId', 'date', 'status', 'checkIn', 'checkOut', 'hours', 'workMode']),
  myTodayAttendance,
  myAttendanceHistory,
  checkIn,
  checkOut,
  feedback: makeCrud('interview_feedback', ['candidate', 'interviewer', 'recommendation'],
    ['candidate', 'interviewId', 'interviewer', 'rating', 'recommendation', 'comments']),
  jobs: makeCrud('open_jobs', ['title', 'department'],
    ['title', 'department', 'applicants', 'openSince']),
  // Performance module — manual entry (not derived from the Production
  // render-job tracker, by explicit choice), one doc per employee per period
  // per category (Walkthrough/Floor Plan/Masterplan/3D Views) — target vs.
  // delivered, so "remaining" is computed as target - delivered per
  // category. Directory.jsx upserts by looking up an existing doc for
  // (employeeId, periodKey, category) before deciding create vs. update.
  performance: makeCrud('performance_entries', ['employeeId', 'periodKey', 'category'],
    ['employeeId', 'period', 'periodKey', 'category', 'target', 'delivered']),
  leaveEntries: makeCrud('leave_entries', ['employeeId', 'periodKey'],
    ['employeeId', 'period', 'periodKey', 'taken']),
};
