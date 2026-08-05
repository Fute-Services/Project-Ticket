const { db } = require('../config/firebase');
const { toDoc } = require('../utils/complaints');

const RECENT_LIMIT = 5;

// GET /api/stats/me — headline numbers for the signed-in user's own tickets.
// A single person's ticket count stays small, so aggregating in memory is fine
// here; the paginated list endpoints are what protect against large collections.
async function myStats(req, res) {
  const [hrSnap, itSnap] = await Promise.all([
    db.collection('hr_complaints').where('user_id', '==', req.user.id).get(),
    db.collection('it_complaints').where('user_id', '==', req.user.id).get(),
  ]);

  const all = [
    ...hrSnap.docs.map(d => ({ ...toDoc(d), dept_tag: 'HR' })),
    ...itSnap.docs.map(d => ({ ...toDoc(d), dept_tag: 'IT' })),
  ];

  const count = status => all.filter(c => c.status === status).length;

  const recent = all
    .slice()
    .sort((a, b) => new Date(b.updated_at || b.submitted_at) - new Date(a.updated_at || a.submitted_at))
    .slice(0, RECENT_LIMIT)
    .map(c => ({
      id: c.id,
      token: c.token,
      dept_tag: c.dept_tag,
      status: c.status,
      priority: c.priority,
      description: c.description,
      updated_at: c.updated_at || c.submitted_at,
    }));

  res.json({
    total: all.length,
    pending: count('Pending'),
    in_progress: count('In Progress'),
    completed: count('Completed'),
    recent,
  });
}

module.exports = { myStats };
