// Shared helpers for the HR and IT complaint controllers.

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const STATUSES = ['Pending', 'In Progress', 'Completed'];

// Generate a token like FT-HR-8X2A7K
function generateToken(deptPrefix) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return `FT-${deptPrefix}-${result}`;
}

// Clamp ?limit= to something a single request can safely serve
function pageSize(req) {
  const n = parseInt(req.query.limit, 10);
  if (Number.isNaN(n) || n < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(n, MAX_PAGE_SIZE);
}

function toDoc(d) {
  return { id: d.id, ...d.data() };
}

function byRecent(a, b) {
  return new Date(b.submitted_at) - new Date(a.submitted_at);
}

// Firestore throws code 9 / 'failed-precondition' when a composite index is missing
function isMissingIndex(err) {
  return err.code === 9 || err.code === 'failed-precondition';
}

/**
 * Fetch one newest-first page from a complaints query.
 *
 * The cursor is simply the `submitted_at` of the last item on the previous page,
 * so it survives across requests without holding a document snapshot. Two
 * complaints written in the same millisecond would collide, which does not
 * happen at this application's write rate.
 *
 * Falls back to an in-memory sort when the composite index for a filtered query
 * has not been deployed yet (see firestore.indexes.json).
 *
 * @returns {Promise<{items: object[], nextCursor: string|null, hasMore: boolean}>}
 */
async function fetchPage(baseQuery, { limit, cursor }) {
  let docs;
  try {
    let q = baseQuery.orderBy('submitted_at', 'desc');
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.limit(limit + 1).get();
    docs = snap.docs.map(toDoc);
  } catch (err) {
    if (!isMissingIndex(err)) throw err;
    const snap = await baseQuery.get();
    const all = snap.docs.map(toDoc).sort(byRecent);
    const start = cursor ? all.findIndex(c => c.submitted_at === cursor) + 1 : 0;
    docs = all.slice(start, start + limit + 1);
  }
  return buildPage(docs, limit);
}

// Turn `limit + 1` fetched rows into a page plus a next-page cursor
function buildPage(docs, limit) {
  const hasMore = docs.length > limit;
  const items = hasMore ? docs.slice(0, limit) : docs;
  return {
    items,
    hasMore,
    nextCursor: hasMore ? items[items.length - 1].submitted_at : null,
  };
}

module.exports = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  STATUSES,
  generateToken,
  pageSize,
  toDoc,
  byRecent,
  fetchPage,
  buildPage,
};
