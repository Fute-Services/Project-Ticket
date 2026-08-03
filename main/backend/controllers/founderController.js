const supabase = require('../config/supabase');

// GET /api/founder/complaints — returns all HR + IT complaints combined
async function getAllComplaints(req, res) {
  const [hrResult, itResult] = await Promise.all([
    supabase.from('hr_complaints').select('*').order('submitted_at', { ascending: false }),
    supabase.from('it_complaints').select('*').order('submitted_at', { ascending: false }),
  ]);

  if (hrResult.error) return res.status(400).json({ error: hrResult.error.message });
  if (itResult.error) return res.status(400).json({ error: itResult.error.message });

  // Tag each complaint with its department
  const hrTagged = (hrResult.data || []).map(c => ({ ...c, dept_tag: 'HR' }));
  const itTagged = (itResult.data || []).map(c => ({ ...c, dept_tag: 'IT' }));

  // Merge and sort by submitted_at descending
  const all = [...hrTagged, ...itTagged].sort(
    (a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)
  );

  res.json(all);
}

module.exports = { getAllComplaints };
