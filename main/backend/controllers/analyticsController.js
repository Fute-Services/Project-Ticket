const { db } = require('../config/db');
const { ok } = require('../utils/respond');

// GET /api/founder/analytics — cross-department snapshot for the Super
// Admin dashboard. Reads counts only (no PII beyond what's already exposed
// via existing per-department endpoints).
// A record with no date field is only included when no range filter is
// active — filtering it out under an active filter is the safer default
// (silently-wrong inclusion is worse than an honest under-count).
function inDateRange(iso, from, to) {
  if (!from && !to) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  if (from && t < new Date(from).getTime()) return false;
  if (to && t > new Date(to).getTime()) return false;
  return true;
}

function summarizeTicketDocs(docs) {
  const byStatus = {};
  const resolutionMs = [];
  docs.forEach((d) => {
    const t = d.data();
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    if (t.status === 'Completed' && t.submitted_at && t.updated_at) {
      const ms = new Date(t.updated_at) - new Date(t.submitted_at);
      if (Number.isFinite(ms) && ms >= 0) resolutionMs.push(ms);
    }
  });
  const avgResolutionHours = resolutionMs.length
    ? Math.round((resolutionMs.reduce((a, b) => a + b, 0) / resolutionMs.length / 3600000) * 10) / 10
    : null;
  return { total: docs.length, byStatus, avgResolutionHours };
}

// Bounds a collection scan to the requested date range at the Firestore
// query level (instead of fetching the whole collection and filtering in
// memory in computeAnalytics below) — same `inDateRange` semantics, just
// pushed into a `.where()` so an unbounded range doesn't re-read every
// historical doc on every analytics request. Also caps every call (filtered
// or not) at ANALYTICS_READ_CAP: an explicit from/to already bounds cost via
// the `.where()`, but the no-filter default previously meant "read every doc
// in all 5 collections, forever" — the single most expensive, most
// re-triggerable query in the app (hit on every Analytics page load and
// every CSV export click). A flat cap (rather than a rolling date window)
// keeps undated legacy docs eligible for the unfiltered view, same as
// before — see inDateRange's reasoning below.
const ANALYTICS_READ_CAP = 5000;
function rangedQuery(collectionRef, field, from, to) {
  let q = collectionRef;
  if (from) q = q.where(field, '>=', from);
  if (to) q = q.where(field, '<=', to);
  return q.limit(ANALYTICS_READ_CAP);
}

// Short TTL so a founder/superadmin repeatedly loading the Analytics page or
// double-clicking "Export CSV" doesn't re-run 5 full-ish collection reads
// every time — same pattern as authMiddleware's profile cache.
const ANALYTICS_CACHE_MS = 60_000;
const analyticsCache = new Map(); // "from|to" -> { data, expiresAt }

// Shared by GET /analytics (JSON) and GET /analytics/export (CSV) so the two
// never disagree about what a given date range actually includes.
async function computeAnalytics({ from, to } = {}) {
  const cacheKey = `${from || ''}|${to || ''}`;
  const cached = analyticsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const [usersSnap, hrSnap, itSnap, approvalsSnap, leaveSnap] = await Promise.all([
    rangedQuery(db.collection('users'), 'created_at', from, to).get(),
    rangedQuery(db.collection('hr_complaints'), 'submitted_at', from, to).get(),
    rangedQuery(db.collection('it_complaints'), 'submitted_at', from, to).get(),
    rangedQuery(db.collection('approvals'), 'createdAt', from, to).get(),
    rangedQuery(db.collection('leave_requests'), 'submitted_at', from, to).get(),
  ]);

  const userDocs = usersSnap.docs.filter((d) => inDateRange(d.data().created_at, from, to));
  const hrDocs = hrSnap.docs.filter((d) => inDateRange(d.data().submitted_at, from, to));
  const itDocs = itSnap.docs.filter((d) => inDateRange(d.data().submitted_at, from, to));
  const approvalDocs = approvalsSnap.docs.filter((d) => inDateRange(d.data().createdAt, from, to));
  const leaveDocs = leaveSnap.docs.filter((d) => inDateRange(d.data().submitted_at, from, to));

  const usersByRole = {};
  let activeUsers = 0;
  userDocs.forEach((d) => {
    const u = d.data();
    usersByRole[u.role] = (usersByRole[u.role] || 0) + 1;
    if (u.active !== false) activeUsers += 1;
  });

  const approvalsByStatus = {};
  approvalDocs.forEach((d) => {
    const a = d.data();
    approvalsByStatus[a.status] = (approvalsByStatus[a.status] || 0) + 1;
  });

  const result = {
    range: { from: from || null, to: to || null },
    users: { total: userDocs.length, active: activeUsers, byRole: usersByRole },
    tickets: { hr: summarizeTicketDocs(hrDocs), it: summarizeTicketDocs(itDocs) },
    approvals: { total: approvalDocs.length, byStatus: approvalsByStatus },
    leave: { total: leaveDocs.length },
  };
  analyticsCache.set(cacheKey, { data: result, expiresAt: Date.now() + ANALYTICS_CACHE_MS });
  return result;
}

// GET /api/founder/analytics?from=&to= — ISO date strings, optional.
async function getAnalytics(req, res) {
  const { from, to } = req.query;
  ok(res, await computeAnalytics({ from, to }), { message: 'Analytics fetched successfully' });
}

function csvEscape(value) {
  let s = String(value ?? '');
  // A value starting with =, +, -, @, a tab, or a carriage return is
  // interpreted as a live formula by Excel/Sheets the moment the export is
  // opened (CSV/formula injection — tab/CR are the two the plain =/+/-/@
  // check alone misses) — prefix with a leading apostrophe first so it's
  // forced back to plain text, matching the standard neutralization those
  // tools respect.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/founder/analytics/export?from=&to= — flat Section/Metric/Value
// rows, since the underlying data is a handful of small breakdowns, not one
// big table. Excel/PDF export isn't built — CSV covers "get the numbers
// out" and opens in Excel/Sheets natively anyway.
async function getAnalyticsCsv(req, res) {
  const { from, to } = req.query;
  const data = await computeAnalytics({ from, to });

  const rows = [['Section', 'Metric', 'Value']];
  rows.push(['Users', 'Total', data.users.total]);
  rows.push(['Users', 'Active', data.users.active]);
  Object.entries(data.users.byRole).forEach(([role, count]) => rows.push(['Users', `By role: ${role}`, count]));
  rows.push(['HR Tickets', 'Total', data.tickets.hr.total]);
  rows.push(['HR Tickets', 'Avg resolution (hours)', data.tickets.hr.avgResolutionHours ?? '']);
  Object.entries(data.tickets.hr.byStatus).forEach(([s, c]) => rows.push(['HR Tickets', `By status: ${s}`, c]));
  rows.push(['IT Tickets', 'Total', data.tickets.it.total]);
  rows.push(['IT Tickets', 'Avg resolution (hours)', data.tickets.it.avgResolutionHours ?? '']);
  Object.entries(data.tickets.it.byStatus).forEach(([s, c]) => rows.push(['IT Tickets', `By status: ${s}`, c]));
  rows.push(['Approvals', 'Total', data.approvals.total]);
  Object.entries(data.approvals.byStatus).forEach(([s, c]) => rows.push(['Approvals', `By status: ${s}`, c]));
  rows.push(['Leave', 'Total', data.leave.total]);

  const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="analytics-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
}

module.exports = { getAnalytics, getAnalyticsCsv };
