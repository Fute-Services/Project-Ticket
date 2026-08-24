const { db } = require('../config/firebase');
const { UNPAGINATED_READ_LIMIT } = require('../utils/constants');
const { sendMail, escapeHtml } = require('../utils/mailer');

const sentCollection = db.collection('sent_emails');

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

// Six HR sub-resources (Candidates, Interviews, Meetings, Attendance,
// Feedback, Job postings) share the same shape of CRUD — list/create/
// update/delete against one Firestore collection, no cross-resource logic —
// so one factory replaces six near-identical controllers.
function makeCrud(collectionName, requiredFields, editableFields) {
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
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    res.json(rows);
  }

  async function create(req, res) {
    for (const field of requiredFields) {
      if (!req.body[field]) return res.status(400).json({ error: `${field} is required` });
    }
    const docData = { created_at: new Date().toISOString() };
    for (const key of editableFields) {
      if (req.body[key] !== undefined) docData[key] = req.body[key];
    }
    const docRef = await collection.add(docData);
    res.status(201).json({ id: docRef.id, ...docData });
  }

  async function update(req, res) {
    const { id } = req.params;
    const docRef = collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    const updates = { updated_at: new Date().toISOString() };
    for (const key of editableFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    await docRef.update(updates);
    res.json({ id, ...doc.data(), ...updates });
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

module.exports = {
  sendEmail,
  getSentEmails,
  employees: makeCrud('employees', ['name', 'department'],
    ['name', 'department', 'designation', 'status', 'email', 'phone', 'manager', 'joiningDate']),
  candidates: makeCrud('candidates', ['name', 'email'],
    ['name', 'email', 'phone', 'location', 'skills', 'experience', 'education', 'expectedSalary',
      'currentCompany', 'portfolio', 'source', 'stage', 'appliedFor', 'appliedOn', 'resumeFileName']),
  interviews: makeCrud('interviews', ['candidate', 'type', 'date'],
    ['candidate', 'type', 'interviewer', 'date', 'time', 'link', 'location', 'notes', 'status']),
  meetings: makeCrud('meetings', ['title', 'date'],
    ['title', 'type', 'agenda', 'participants', 'date', 'time', 'notes']),
  attendance: makeCrud('attendance', ['employeeId', 'date', 'status'],
    ['employeeId', 'date', 'status', 'checkIn', 'checkOut', 'hours']),
  feedback: makeCrud('interview_feedback', ['candidate', 'interviewer', 'recommendation'],
    ['candidate', 'interviewId', 'interviewer', 'rating', 'recommendation', 'comments']),
  jobs: makeCrud('open_jobs', ['title', 'department'],
    ['title', 'department', 'applicants', 'openSince']),
};
