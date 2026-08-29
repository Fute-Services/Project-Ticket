const { db, bucket } = require('../config/firebase');
const { Timestamp } = require('firebase-admin').firestore;
const { UNPAGINATED_READ_LIMIT } = require('../utils/constants');
const { sendMail, escapeHtml } = require('../utils/mailer');

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
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject and body are required' });

  const html = `<div style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(body)}</div>`;
  try {
    await sendMail(to, subject, html);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to send email' });
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
  res.status(201).json({ id: docRef.id, ...docData });
}

// GET /api/hr-desk/send-email — Sent folder history. No `.orderBy('time')`
// on the query itself — see the comment in makeCrud's list() below for why.
async function getSentEmails(req, res) {
  const snap = await sentCollection.limit(UNPAGINATED_READ_LIMIT).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
  res.json(rows);
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
    res.json(rows);
  }

  async function create(req, res) {
    for (const field of requiredFields) {
      if (!req.body[field]) return res.status(400).json({ error: `${field} is required` });
    }
    const docData = { created_at: new Date().toISOString() };
    if (trackUpdatedBy) docData.lastUpdatedBy = req.user.full_name;
    for (const key of editableFields) {
      if (req.body[key] !== undefined) docData[key] = transforms[key] ? transforms[key](req.body[key]) : req.body[key];
    }
    const docRef = await collection.add(docData);
    if (afterWrite) await afterWrite(docData);
    res.status(201).json({ id: docRef.id, ...serializeDoc(docData) });
  }

  async function update(req, res) {
    const { id } = req.params;
    const docRef = collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    const updates = { updated_at: new Date().toISOString() };
    if (trackUpdatedBy) updates.lastUpdatedBy = req.user.full_name;
    for (const key of editableFields) {
      if (req.body[key] !== undefined) updates[key] = transforms[key] ? transforms[key](req.body[key]) : req.body[key];
    }
    await docRef.update(updates);
    const merged = { ...doc.data(), ...updates };
    if (afterWrite) await afterWrite(merged);
    res.json({ id, ...serializeDoc(merged) });
  }

  async function remove(req, res) {
    const { id } = req.params;
    const docRef = collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    await docRef.delete();
    res.json({ id });
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
};

// POST /api/hr-desk/employees/:id/documents/:docType — HR/founder only
// (enforced in the route). Uploads straight to Firebase Storage (no local
// disk write — multer's memoryStorage), then stores a long-lived signed
// read URL + the original filename on the employee doc, matching the two
// fields DOCUMENT_TYPES declares for this docType.
async function uploadEmployeeDocument(req, res) {
  const { id, docType } = req.params;
  const doc = DOCUMENT_TYPES[docType];
  if (!doc) return res.status(400).json({ error: `Unknown document type "${docType}"` });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (!bucket) return res.status(503).json({ error: 'File storage is not configured on this server' });

  const employeeRef = db.collection('employees').doc(id);
  if (!(await employeeRef.get()).exists) return res.status(404).json({ error: 'Employee not found' });

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

  res.json({ id, ...updates, approvalId: approvalRef.id });
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
  if (!req.user.employeeId) return res.json(null);
  const doc = await findTodayDoc(req.user.employeeId);
  res.json(doc ? { id: doc.id, ...doc.data() } : null);
}

// POST /api/hr-desk/attendance/check-in — workMode 'Leave' marks the whole
// day as leave (no check-in time/timer, just a status), self-declared from
// the same widget as Office/WFH check-in — no separate approval step. This
// is the one and only place attendance.status can become 'Leave', so a
// leave-taken count anywhere else (Directory's Employee Profile) can trust
// counting these rows directly instead of re-deriving it some other way.
async function checkIn(req, res) {
  if (!req.user.employeeId) {
    return res.status(400).json({ error: 'Your account is not linked to an employee record yet — ask HR to set that up.' });
  }
  const workMode = ['WFH', 'Leave'].includes(req.body.workMode) ? req.body.workMode : 'Office';
  const existing = await findTodayDoc(req.user.employeeId);
  if (existing && existing.data().checkIn && existing.data().checkIn !== '-' && (!existing.data().checkOut || existing.data().checkOut === '-')) {
    return res.status(409).json({ error: 'Already checked in for today.' });
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
    return res.status(201).json(rows[0]);
  }

  // "HH:MM" (not a full timestamp) — matches the format Attendance.jsx's
  // workingHours() already parses, so self-check-in stays compatible with
  // however else this collection's rows get read.
  const checkInTime = new Date().toTimeString().slice(0, 5);
  if (existing) {
    await existing.ref.update({ checkIn: checkInTime, checkOut: '-', status: 'Present', workMode });
    return res.json({ id: existing.id, ...existing.data(), checkIn: checkInTime, checkOut: '-', status: 'Present', workMode });
  }
  const docData = { employeeId: req.user.employeeId, date: todayStr(), status: 'Present', checkIn: checkInTime, checkOut: '-', hours: null, workMode };
  const docRef = await attendanceCollection.add(docData);
  res.status(201).json({ id: docRef.id, ...docData });
}

// POST /api/hr-desk/attendance/check-out
async function checkOut(req, res) {
  if (!req.user.employeeId) {
    return res.status(400).json({ error: 'Your account is not linked to an employee record yet — ask HR to set that up.' });
  }
  const doc = await findTodayDoc(req.user.employeeId);
  if (!doc || !doc.data().checkIn || doc.data().checkIn === '-') {
    return res.status(409).json({ error: 'You have not checked in today.' });
  }
  if (doc.data().checkOut && doc.data().checkOut !== '-') {
    return res.status(409).json({ error: 'Already checked out for today.' });
  }

  const checkOutTime = new Date().toTimeString().slice(0, 5);
  const [inH, inM] = doc.data().checkIn.split(':').map(Number);
  const [outH, outM] = checkOutTime.split(':').map(Number);
  const hours = Math.max(0, (outH * 60 + outM - (inH * 60 + inM)) / 60);
  await doc.ref.update({ checkOut: checkOutTime, hours });
  res.json({ id: doc.id, ...doc.data(), checkOut: checkOutTime, hours });
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
    return res.status(400).json({ error: 'Your account is not linked to an employee record yet — ask HR to set that up.' });
  }
  const { projectCode, hours, date, time, teammates } = req.body;
  if (!projectCode || !hours || !date) {
    return res.status(400).json({ error: 'projectCode, hours and date are required' });
  }

  const employeeDoc = await db.collection('employees').doc(req.user.employeeId).get();
  const employeeName = employeeDoc.exists ? employeeDoc.data().name : req.user.full_name;

  const docData = {
    employeeId: req.user.employeeId,
    projectCode,
    hours: Number(hours) || 0,
    date,
    time: time || '',
    teammates: Array.isArray(teammates) ? teammates : [],
    status: 'pending_founder',
    createdAt: new Date().toISOString(),
  };
  const docRef = await extraHoursCollection.add(docData);

  const approvalDoc = {
    source: 'HR',
    category: 'extra-hours',
    title: `Extra hours — ${employeeName} (${projectCode})`,
    sub: `${docData.hours}h on ${date}`,
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
    `<p><strong>${escapeHtml(employeeName)}</strong> logged <strong>${docData.hours}h</strong> on project <strong>${escapeHtml(projectCode)}</strong> (${escapeHtml(date)}). Awaiting sign-off.</p>`
  );

  res.status(201).json({ id: docRef.id, ...docData, approvalId: approvalRef.id });
}

// GET /api/hr-desk/extra-hours/me — the calling employee's own entries only.
async function myExtraHours(req, res) {
  if (!req.user.employeeId) return res.json([]);
  const snap = await extraHoursCollection
    .where('employeeId', '==', req.user.employeeId)
    .limit(UNPAGINATED_READ_LIMIT)
    .get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(rows);
}

// GET /api/hr-desk/extra-hours — HR/founder, every employee's entries
// (bounded, same UNPAGINATED_READ_LIMIT convention as the rest of HR desk).
async function listExtraHours(req, res) {
  const snap = await extraHoursCollection.limit(UNPAGINATED_READ_LIMIT).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(rows);
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
  if (!req.user.employeeId) return res.json({ entitlement: 0, takenYear: 0, remaining: 0, entries: [] });
  const [empDoc, entriesSnap] = await Promise.all([
    db.collection('employees').doc(req.user.employeeId).get(),
    leaveEntriesCollection.where('employeeId', '==', req.user.employeeId).limit(UNPAGINATED_READ_LIMIT).get(),
  ]);
  const entitlement = Number(empDoc.exists ? empDoc.data().leaveEntitlement : 0) || DEFAULT_LEAVE_ENTITLEMENT;
  const entries = entriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const takenYear = entries.reduce((s, e) => s + (Number(e.taken) || 0), 0);
  res.json({ entitlement, takenYear, remaining: Math.max(0, entitlement - takenYear), entries });
}

// GET /api/hr-desk/performance/me — self-scoped, mirrors myLeaveSummary.
async function myPerformance(req, res) {
  if (!req.user.employeeId) return res.json([]);
  const snap = await db
    .collection('performance_entries')
    .where('employeeId', '==', req.user.employeeId)
    .limit(UNPAGINATED_READ_LIMIT)
    .get();
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

module.exports = {
  sendEmail,
  getSentEmails,
  myLeaveSummary,
  myPerformance,
  submitExtraHours,
  myExtraHours,
  listExtraHours,
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
