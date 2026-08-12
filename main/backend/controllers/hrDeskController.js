const { db } = require('../config/firebase');
const { sendMail } = require('../utils/mailer');

const sentCollection = db.collection('sent_emails');

// POST /api/hr-desk/send-email — { to, subject, body } — actually sends via
// the same SMTP transport complaint notifications use, then keeps a record
// so the Sent folder reflects real history across sessions/devices.
async function sendEmail(req, res) {
  const { to, subject, body } = req.body;
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject and body are required' });

  const html = `<div style="font-family:sans-serif;white-space:pre-wrap">${body}</div>`;
  await sendMail(to, subject, html);

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

// GET /api/hr-desk/send-email — Sent folder history
async function getSentEmails(req, res) {
  const snap = await sentCollection.get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => new Date(b.time) - new Date(a.time));
  res.json(rows);
}

// Six HR sub-resources (Candidates, Interviews, Meetings, Attendance,
// Feedback, Job postings) share the same shape of CRUD — list/create/
// update/delete against one Firestore collection, no cross-resource logic —
// so one factory replaces six near-identical controllers.
function makeCrud(collectionName, requiredFields) {
  const collection = db.collection(collectionName);

  async function list(req, res) {
    const snap = await collection.get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  async function create(req, res) {
    for (const field of requiredFields) {
      if (!req.body[field]) return res.status(400).json({ error: `${field} is required` });
    }
    const docData = { ...req.body, created_at: new Date().toISOString() };
    delete docData.id;
    const docRef = await collection.add(docData);
    res.status(201).json({ id: docRef.id, ...docData });
  }

  async function update(req, res) {
    const { id } = req.params;
    const docRef = collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id;
    await docRef.update(updates);
    res.json({ id, ...(await docRef.get()).data() });
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
  employees: makeCrud('employees', ['name', 'department']),
  candidates: makeCrud('candidates', ['name', 'email']),
  interviews: makeCrud('interviews', ['candidate', 'type', 'date']),
  meetings: makeCrud('meetings', ['title', 'date']),
  attendance: makeCrud('attendance', ['employeeId', 'date', 'status']),
  feedback: makeCrud('interview_feedback', ['candidate', 'interviewer', 'recommendation']),
  jobs: makeCrud('open_jobs', ['title', 'department']),
};
