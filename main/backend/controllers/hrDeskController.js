const { db } = require('../config/firebase');

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
  employees: makeCrud('employees', ['name', 'department']),
  candidates: makeCrud('candidates', ['name', 'email']),
  interviews: makeCrud('interviews', ['candidate', 'type', 'date']),
  meetings: makeCrud('meetings', ['title', 'date']),
  attendance: makeCrud('attendance', ['employeeId', 'date', 'status']),
  feedback: makeCrud('interview_feedback', ['candidate', 'interviewer', 'recommendation']),
  jobs: makeCrud('open_jobs', ['title', 'department']),
};
