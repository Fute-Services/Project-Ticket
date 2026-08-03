const { db } = require('../config/firebase');

// GET /api/founder/complaints — returns all HR + IT complaints combined
async function getAllComplaints(req, res) {
  const [hrSnap, itSnap] = await Promise.all([
    db.collection('hr_complaints').get(),
    db.collection('it_complaints').get(),
  ]);

  const hrTagged = hrSnap.docs.map(d => ({ id: d.id, ...d.data(), dept_tag: 'HR' }));
  const itTagged = itSnap.docs.map(d => ({ id: d.id, ...d.data(), dept_tag: 'IT' }));

  // Merge and sort by submitted_at descending
  const all = [...hrTagged, ...itTagged].sort(
    (a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)
  );

  res.json(all);
}

module.exports = { getAllComplaints };
