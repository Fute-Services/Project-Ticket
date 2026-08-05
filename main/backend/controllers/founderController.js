const { db } = require('../config/firebase');
const { pageSize, fetchPage, byRecent } = require('../utils/complaints');

// GET /api/founder/complaints?limit=&cursor= — one merged page of HR + IT complaints
async function getAllComplaints(req, res) {
  const limit = pageSize(req);
  const cursor = req.query.cursor;

  // Each side returns its own newest `limit` rows after the cursor, so the
  // globally newest `limit` rows are guaranteed to be inside the union.
  const [hr, it] = await Promise.all([
    fetchPage(db.collection('hr_complaints'), { limit, cursor }),
    fetchPage(db.collection('it_complaints'), { limit, cursor }),
  ]);

  const merged = [
    ...hr.items.map(c => ({ ...c, dept_tag: 'HR' })),
    ...it.items.map(c => ({ ...c, dept_tag: 'IT' })),
  ].sort(byRecent);

  const hasMore = merged.length > limit || hr.hasMore || it.hasMore;
  const items = merged.slice(0, limit);

  res.json({
    items,
    hasMore,
    nextCursor: hasMore && items.length ? items[items.length - 1].submitted_at : null,
  });
}

module.exports = { getAllComplaints };
