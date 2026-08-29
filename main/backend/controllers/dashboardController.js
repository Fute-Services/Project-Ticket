const { db } = require('../config/firebase');
const { UNPAGINATED_READ_LIMIT, FOUNDER_LIST_CAP, DASHBOARD_SCAN_CAP } = require('../utils/constants');
const { AUDIT_LOGS } = require('../utils/auditLog');
const { SESSIONS } = require('../utils/sessions');
const { SLA_POLICIES_DOC, DEFAULT_SLA_POLICIES } = require('./slaController');
const { DEPARTMENTS } = require('./departmentController');
const { ok, fail } = require('../utils/respond');

// Ticket age vs. its priority's SLA policy decides "overdue" — reads the
// same per-priority resolutionMinutes the SLA Management page configures
// (settings/sla_policies), so this dashboard and that page never disagree
// about what counts as a breach.
function summarizeQueueForOverview(snap, queuePolicies) {
  const now = Date.now();
  let open = 0, pending = 0, resolved = 0, highPriorityOpen = 0, overdue = 0;
  const resolutionMs = [];
  snap.docs.forEach((d) => {
    const t = d.data();
    if (t.status === 'Completed') {
      resolved += 1;
      if (t.submitted_at && t.updated_at) {
        const ms = new Date(t.updated_at) - new Date(t.submitted_at);
        if (Number.isFinite(ms) && ms >= 0) resolutionMs.push(ms);
      }
      return;
    }
    open += 1;
    if (t.status === 'Pending') pending += 1;
    if (t.priority === 'High') highPriorityOpen += 1;
    const policy = queuePolicies[t.priority] || queuePolicies.Medium;
    const ageMinutes = t.submitted_at ? (now - new Date(t.submitted_at).getTime()) / 60000 : null;
    if (policy && Number.isFinite(ageMinutes) && ageMinutes > policy.resolutionMinutes) overdue += 1;
  });
  const avgResolutionHours = resolutionMs.length
    ? Math.round((resolutionMs.reduce((a, b) => a + b, 0) / resolutionMs.length / 3600000) * 10) / 10
    : null;
  return { total: snap.size, open, pending, resolved, highPriorityOpen, overdue, avgResolutionHours };
}

// This is the Super Admin landing page — the single most-hit endpoint in the
// app — so its result is cached briefly rather than recomputed on every
// load, same 30-60s tradeoff already used by authMiddleware's profile cache
// and permissionMiddleware's action cache.
const DASHBOARD_CACHE_MS = 30_000;
let dashboardCache = null; // { data, expiresAt }

// GET /api/founder/dashboard-overview — Super Admin's landing screen data.
// Deliberately superadmin-only (unlike analytics' broader-but-thinner
// snapshot) since this composes org/IT/HR/security-adjacent numbers in one
// call. Sections the app has no real data source for yet (storage usage,
// failed background jobs, integration sync status, MFA/session security —
// that's the Security Center phase) report `tracked: false` instead of a
// fabricated number, so the UI can show "not tracked yet" honestly.
async function computeDashboardOverview() {
  if (dashboardCache && dashboardCache.expiresAt > Date.now()) return dashboardCache.data;

  const dbPingStart = Date.now();
  const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
  // These six are only ever used for a count (`.size`), never per-document
  // fields, so `.count().get()` asks Firestore for just the number instead
  // of transferring every matching document — the other five below need
  // actual field data (role/active, ticket SLA fields, warrantyEnd) so they
  // stay full scans, capped at DASHBOARD_SCAN_CAP.
  const [usersSnap, deptCount, itSnap, hrSnap, approvalsCount, leaveCount, assetsSnap, policiesDoc, activeSessionsCount, recentFailedLoginsCount, lockedAccountsCount] = await Promise.all([
    db.collection('users').limit(DASHBOARD_SCAN_CAP).get(),
    db.collection('departments').count().get(),
    db.collection('it_complaints').limit(DASHBOARD_SCAN_CAP).get(),
    db.collection('hr_complaints').limit(DASHBOARD_SCAN_CAP).get(),
    db.collection('approvals').where('status', '==', 'pending_founder').count().get(),
    db.collection('leave_requests').where('status', '==', 'Pending').count().get(),
    db.collection('assets').limit(DASHBOARD_SCAN_CAP).get(),
    SLA_POLICIES_DOC.get(),
    SESSIONS.where('revoked', '==', false).count().get(),
    db.collection('failed_logins').where('at', '>=', oneDayAgo).count().get(),
    db.collection('users').where('locked', '==', true).count().get(),
  ]);
  const dbPingMs = Date.now() - dbPingStart;
  const policies = policiesDoc.exists ? { ...DEFAULT_SLA_POLICIES, ...policiesDoc.data() } : DEFAULT_SLA_POLICIES;

  const usersByRole = {};
  let activeUsers = 0;
  usersSnap.docs.forEach((d) => {
    const u = d.data();
    usersByRole[u.role] = (usersByRole[u.role] || 0) + 1;
    if (u.active !== false) activeUsers += 1;
  });

  const it = summarizeQueueForOverview(itSnap, policies.it);
  const hr = summarizeQueueForOverview(hrSnap, policies.hr);

  const in30Days = Date.now() + 30 * 24 * 3600000;
  const expiringAssets = assetsSnap.docs.filter((d) => {
    const end = d.data().warrantyEnd;
    if (!end) return false;
    const ts = new Date(end).getTime();
    return Number.isFinite(ts) && ts >= Date.now() && ts <= in30Days;
  }).length;

  const requiresAttention = [
    { key: 'it_sla_breach', label: 'IT tickets past SLA', count: it.overdue, severity: 'critical' },
    { key: 'hr_sla_breach', label: 'HR tickets past SLA', count: hr.overdue, severity: 'critical' },
    { key: 'it_high_priority', label: 'High-priority IT tickets open', count: it.highPriorityOpen, severity: 'warning' },
    { key: 'hr_high_priority', label: 'High-priority HR tickets open', count: hr.highPriorityOpen, severity: 'warning' },
    { key: 'pending_approvals', label: 'Approvals awaiting decision', count: approvalsCount.data().count, severity: 'warning' },
    { key: 'expiring_assets', label: 'Assets with warranty expiring in 30 days', count: expiringAssets, severity: 'info' },
    { key: 'locked_accounts', label: 'Accounts locked out', count: lockedAccountsCount.data().count, severity: 'critical' },
  ].filter((item) => item.count > 0);

  const result = {
    organization: {
      totalEmployees: usersSnap.size,
      activeEmployees: activeUsers,
      inactiveEmployees: usersSnap.size - activeUsers,
      totalDepartments: deptCount.data().count,
      byRole: usersByRole,
    },
    it,
    hr: { ...hr, pendingLeaveRequests: leaveCount.data().count },
    systemHealth: {
      database: { tracked: true, status: 'reachable', pingMs: dbPingMs },
      server: { tracked: true, status: 'running', uptimeSeconds: Math.round(process.uptime()) },
      api: { tracked: true, status: 'reachable' },
      storage: { tracked: false },
      failedJobs: { tracked: false },
      integrations: { tracked: false },
    },
    security: {
      tracked: true,
      activeSessions: activeSessionsCount.data().count,
      failedLoginsLast24h: recentFailedLoginsCount.data().count,
      lockedAccounts: lockedAccountsCount.data().count,
    },
    requiresAttention,
  };
  dashboardCache = { data: result, expiresAt: Date.now() + DASHBOARD_CACHE_MS };
  return result;
}

async function getDashboardOverview(req, res) {
  ok(res, await computeDashboardOverview(), { message: 'Dashboard overview fetched successfully' });
}

// GET /api/founder/search?q=term — in-memory substring match over bounded
// reads (limit(300) per collection), not per-field Firestore range queries.
// ponytail: fine at this app's real scale (dozens–low-hundreds of docs per
// collection, seen firsthand in earlier phases); if any collection grows
// into the thousands this needs real indexed search instead.
async function search(req, res) {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) return ok(res, { users: [], tickets: [], assets: [], departments: [] });

  // No `.orderBy(...)` on any of these — Firestore silently drops any
  // document missing the ordered field from the result set entirely, which
  // would make legacy tickets/assets unsearchable. Order doesn't matter
  // here anyway since results are filtered by match and truncated below.
  const [usersSnap, hrSnap, itSnap, assetsSnap, deptSnap] = await Promise.all([
    db.collection('users').limit(300).get(),
    db.collection('hr_complaints').limit(UNPAGINATED_READ_LIMIT).get(),
    db.collection('it_complaints').limit(UNPAGINATED_READ_LIMIT).get(),
    db.collection('assets').limit(UNPAGINATED_READ_LIMIT).get(),
    DEPARTMENTS.limit(UNPAGINATED_READ_LIMIT).get(),
  ]);

  const matches = (...fields) => fields.some((f) => f && String(f).toLowerCase().includes(q));

  const users = usersSnap.docs
    .filter((d) => matches(d.data().email, d.data().full_name))
    .slice(0, 10)
    .map((d) => ({ type: 'user', id: d.id, label: d.data().full_name || d.data().email, sublabel: d.data().email }));

  const tickets = [
    ...hrSnap.docs.map((d) => ({ ...d.data(), id: d.id, queue: 'HR' })),
    ...itSnap.docs.map((d) => ({ ...d.data(), id: d.id, queue: 'IT' })),
  ]
    .filter((t) => matches(t.token, t.name, t.description))
    .slice(0, 10)
    .map((t) => ({ type: 'ticket', id: t.id, label: t.token, sublabel: `${t.queue} · ${t.name} · ${t.status}` }));

  const assets = assetsSnap.docs
    .filter((d) => matches(d.id, d.data().model, d.data().serialNo, d.data().assignedTo))
    .slice(0, 10)
    .map((d) => ({ type: 'asset', id: d.id, label: d.id, sublabel: `${d.data().type} · ${d.data().model}` }));

  const departments = deptSnap.docs
    .filter((d) => matches(d.data().name))
    .slice(0, 10)
    .map((d) => ({ type: 'department', id: d.id, label: d.data().name, sublabel: d.data().active === false ? 'Inactive' : 'Active' }));

  ok(res, { users, tickets, assets, departments });
}

// GET /api/founder/activity-timeline?limit=100 — merges admin actions
// (audit_logs) with operational events (ticket created/updated, approval
// created/decided) into one chronological feed. Tickets/approvals don't
// store a full per-transition history (see itController/approvalController
// — just submitted_at/updated_at, createdAt/decidedAt), so this surfaces
// the two real timestamps each of them actually has rather than fabricating
// a richer history that isn't tracked.
async function getActivityTimeline(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 300);
  // AUDIT_LOGS always has created_at (set by logAudit() on every write), so
  // that orderBy is safe. The other three are left unordered — Firestore
  // silently drops any document missing the ordered field from the result
  // set entirely, and this function already sorts the merged events in JS
  // below, so nothing needs it query-side.
  const [auditSnap, hrSnap, itSnap, approvalsSnap] = await Promise.all([
    AUDIT_LOGS.orderBy('created_at', 'desc').limit(limit).get(),
    db.collection('hr_complaints').limit(FOUNDER_LIST_CAP).get(),
    db.collection('it_complaints').limit(FOUNDER_LIST_CAP).get(),
    db.collection('approvals').limit(FOUNDER_LIST_CAP).get(),
  ]);

  // Same reasoning as getAllComplaints (superAdminUserController.js) — the
  // merge below needs every source event to sort correctly, so a capped
  // source silently drops older events off this feed rather than erroring.
  if (hrSnap.size === FOUNDER_LIST_CAP || itSnap.size === FOUNDER_LIST_CAP || approvalsSnap.size === FOUNDER_LIST_CAP) {
    res.setHeader('X-Results-Truncated', 'true');
  }

  const events = [];

  auditSnap.docs.forEach((d) => {
    const a = d.data();
    events.push({
      id: `audit-${d.id}`,
      type: 'admin_action',
      at: a.created_at,
      actor: a.actor_name || a.actor_email || 'Unknown',
      label: a.action,
      detail: a.target?.email || a.target?.name || null,
    });
  });

  function pushTicketEvents(docs, queue) {
    docs.forEach((d) => {
      const t = d.data();
      if (t.submitted_at) {
        events.push({ id: `${queue}-${d.id}-created`, type: 'ticket_created', at: t.submitted_at, actor: t.name, label: `${queue} ticket created`, detail: t.token });
      }
      if (t.updated_at && t.updated_at !== t.submitted_at) {
        events.push({ id: `${queue}-${d.id}-updated`, type: 'ticket_updated', at: t.updated_at, actor: null, label: `${queue} ticket → ${t.status}`, detail: t.token });
      }
    });
  }
  pushTicketEvents(hrSnap.docs, 'HR');
  pushTicketEvents(itSnap.docs, 'IT');

  approvalsSnap.docs.forEach((d) => {
    const a = d.data();
    if (a.createdAt) {
      events.push({ id: `approval-${d.id}-created`, type: 'approval_created', at: a.createdAt, actor: a.requestedBy, label: 'Approval requested', detail: a.title });
    }
    if (a.decidedAt) {
      events.push({ id: `approval-${d.id}-decided`, type: 'approval_decided', at: a.decidedAt, actor: a.decidedBy, label: `Approval ${a.status}`, detail: a.title });
    }
  });

  events.sort((a, b) => new Date(b.at) - new Date(a.at));
  ok(res, events.slice(0, limit));
}

// PATCH /api/founder/dashboard-layout — { widgets: [id, ...] } persisted on
// the caller's own user doc (per-superadmin, not global — each admin's
// widget order/visibility is their own preference, same idea as the
// Overview page's stat cards). No GET needed: the caller already has this
// in their own profile from GET /api/auth/me.
async function updateDashboardLayout(req, res) {
  const { widgets } = req.body;
  if (!Array.isArray(widgets)) return fail(res, { status: 400, message: 'widgets array is required', code: 'VALIDATION_ERROR' });
  await db.collection('users').doc(req.user.id).set({ dashboardLayout: widgets }, { merge: true });
  ok(res, { widgets }, { message: 'Dashboard layout updated successfully' });
}

module.exports = { getDashboardOverview, search, getActivityTimeline, updateDashboardLayout };
