const { auth, db } = require('../config/firebase');
const { logAudit, AUDIT_LOGS } = require('../utils/auditLog');
const { ACTION_PERMISSIONS_DOC } = require('../middleware/permissionMiddleware');
const { SESSIONS } = require('../utils/sessions');
const { NOTIFICATION_RULES_DOC, loadNotificationRules } = require('../utils/notificationRules');

// Roles Super Admin is allowed to hand-create an account for from the Role
// Permissions page. Deliberately excludes 'founder' and 'superadmin' —
// there's no self-service way to mint either from this screen.
const ASSIGNABLE_ROLES = ['it', 'hr', 'coordinator', 'employee'];

// Roles Super Admin can move an EXISTING user into via the Users page —
// wider than ASSIGNABLE_ROLES because promoting someone to founder is a
// legitimate Super Admin action (superadmin outranks founder). Minting a
// second superadmin still isn't self-service, same reasoning as above.
const EDITABLE_ROLES = ['it', 'hr', 'coordinator', 'employee', 'founder'];

// Tickets store `role`/`user_role` at creation time, so most docs need no
// lookup here at all; only legacy docs missing both fields fall back to a
// bounded, deduped single-doc read instead of scanning the whole users
// collection on every list request.
async function enrichWithUserRole(docs) {
  try {
    const needsLookup = docs.filter((d) => !d.role && !d.user_role);
    const userMap = {};
    if (needsLookup.length > 0) {
      const uniqueUserIds = [...new Set(needsLookup.map((d) => d.user_id).filter(Boolean))];
      await Promise.all(
        uniqueUserIds.map(async (uid) => {
          const doc = await db.collection('users').doc(uid).get();
          if (doc.exists) userMap[uid] = doc.data();
        })
      );
    }

    return docs.map((d) => {
      if (d.role && d.user_role) return d;
      const u = userMap[d.user_id] || {};
      const resolvedRole =
        d.role ||
        u.department ||
        u.designation ||
        (u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : null) ||
        d.user_role ||
        d.department ||
        'Employee';
      const formattedRole = resolvedRole.charAt(0).toUpperCase() + resolvedRole.slice(1);
      return {
        ...d,
        role: formattedRole,
        user_role: formattedRole,
      };
    });
  } catch (e) {
    return docs;
  }
}

// GET /api/founder/complaints — returns all HR + IT complaints combined
async function getAllComplaints(req, res) {
  const [hrSnap, itSnap] = await Promise.all([
    db.collection('hr_complaints').orderBy('submitted_at', 'desc').limit(200).get(),
    db.collection('it_complaints').orderBy('submitted_at', 'desc').limit(200).get(),
  ]);

  const hrTagged = hrSnap.docs.map(d => ({ id: d.id, ...d.data(), dept_tag: 'HR' }));
  const itTagged = itSnap.docs.map(d => ({ id: d.id, ...d.data(), dept_tag: 'IT' }));

  // Merge and sort by submitted_at descending
  const all = [...hrTagged, ...itTagged].sort(
    (a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)
  );

  const enriched = await enrichWithUserRole(all);
  res.json(enriched);
}

// GET /api/founder/users?role=it — no passwords stored here, Firebase Auth
// owns credentials; this collection is just profile + permission data.
// active defaults to true for accounts created before the deactivate
// feature existed (no `active` field written yet).
async function listUsers(req, res) {
  const { role } = req.query;
  const query = role ? db.collection('users').where('role', '==', role) : db.collection('users').limit(200);
  const snap = await query.get();
  const users = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      department: u.department || null,
      permissionOverrides: u.permissionOverrides || {},
      active: u.active !== false,
      created_at: u.created_at || null,
    }));
  res.json(users);
}

// PATCH /api/founder/users/:uid/permissions — { permissionOverrides: {...} }
// replaces that user's whole override map (the Founder UI sends the full
// merged object each time, not a partial patch).
async function updateUserPermissions(req, res) {
  const { uid } = req.params;
  const { permissionOverrides } = req.body;
  if (!permissionOverrides || typeof permissionOverrides !== 'object') {
    return res.status(400).json({ error: 'permissionOverrides object is required' });
  }
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

  await userRef.set({ permissionOverrides }, { merge: true });
  await logAudit({
    actor: req.user,
    action: 'update_user_permissions',
    target: { type: 'user', id: uid, email: userDoc.data().email },
    details: { permissionOverrides },
  });
  res.json({ id: uid, permissionOverrides });
}

// POST /api/founder/users — { email, password, full_name, role, department }
// Unlike POST /api/auth/register (self-signup, role always auto-detected
// from the email pattern — a user can never pick their own role), this lets
// Super Admin assign the role explicitly, since they're deliberately creating
// the account for a specific role's permissions panel rather than the email
// happening to match a pattern like system.fute*.
async function createUser(req, res) {
  const { email, password, full_name, role, department } = req.body;
  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: 'email, password, full_name and role are required' });
  }
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${ASSIGNABLE_ROLES.join(', ')}` });
  }

  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password, displayName: full_name });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const profile = {
    email,
    full_name,
    role,
    department: department || null,
    created_at: new Date().toISOString(),
    permissionOverrides: {},
    active: true,
  };
  await db.collection('users').doc(userRecord.uid).set(profile);
  await logAudit({
    actor: req.user,
    action: 'create_user',
    target: { type: 'user', id: userRecord.uid, email },
    details: { role, department: department || null },
  });

  res.status(201).json({ id: userRecord.uid, ...profile });
}

// PATCH /api/founder/users/:uid — { full_name?, department?, role? }
// Editing a user's own account through this endpoint is blocked so Super
// Admin can never accidentally demote/deactivate themselves out of the panel.
async function updateUser(req, res) {
  const { uid } = req.params;
  const { full_name, department, role } = req.body;
  if (uid === req.user.id) {
    return res.status(400).json({ error: "Can't edit your own account from this panel" });
  }
  if (role !== undefined && !EDITABLE_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${EDITABLE_ROLES.join(', ')}` });
  }
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

  const before = userDoc.data();
  const updates = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (department !== undefined) updates.department = department || null;
  if (role !== undefined) updates.role = role;
  await userRef.set(updates, { merge: true });

  await logAudit({
    actor: req.user,
    action: 'update_user',
    target: { type: 'user', id: uid, email: before.email },
    details: { before: { full_name: before.full_name, department: before.department, role: before.role }, after: updates },
  });

  res.json({ id: uid, ...before, ...updates });
}

// PATCH /api/founder/users/:uid/active — { active: boolean }
// Deactivated accounts fail login (checked in authController) without
// deleting their data — reversible, unlike delete.
async function setUserActive(req, res) {
  const { uid } = req.params;
  const { active, reason } = req.body;
  if (typeof active !== 'boolean') return res.status(400).json({ error: 'active (boolean) is required' });
  if (uid === req.user.id) {
    return res.status(400).json({ error: "Can't deactivate your own account" });
  }
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

  await userRef.set({ active }, { merge: true });
  await auth.updateUser(uid, { disabled: !active });

  await logAudit({
    actor: req.user,
    action: active ? 'reactivate_user' : 'deactivate_user',
    target: { type: 'user', id: uid, email: userDoc.data().email },
    details: reason ? { reason } : null,
  });

  res.json({ id: uid, active });
}

// DELETE /api/founder/users/:uid — removes the Firebase Auth account and
// Firestore profile. Irreversible, unlike deactivate. `reason` is optional
// at the API layer (frontend enforces it via the confirm dialog for
// high-risk actions) — the API stays usable from scripts/tests without it.
async function deleteUser(req, res) {
  const { uid } = req.params;
  const { reason } = req.body;
  if (uid === req.user.id) {
    return res.status(400).json({ error: "Can't delete your own account" });
  }
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
  const email = userDoc.data().email;

  try {
    await auth.deleteUser(uid);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
  }
  await userRef.delete();

  await logAudit({
    actor: req.user,
    action: 'delete_user',
    target: { type: 'user', id: uid, email },
    details: reason ? { reason } : null,
  });

  res.json({ id: uid, deleted: true });
}

// PATCH /api/founder/users/:uid/reset-password — { password }
async function resetUserPassword(req, res) {
  const { uid } = req.params;
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'password (min 6 chars) is required' });
  }
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

  await auth.updateUser(uid, { password });
  await logAudit({
    actor: req.user,
    action: 'reset_user_password',
    target: { type: 'user', id: uid, email: userDoc.data().email },
  });

  res.json({ id: uid, reset: true });
}

// GET /api/founder/audit-logs?limit=100
async function getAuditLogs(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const snap = await AUDIT_LOGS.orderBy('created_at', 'desc').limit(limit).get();
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

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
// historical doc on every analytics request.
function rangedQuery(collectionRef, field, from, to) {
  let q = collectionRef;
  if (from) q = q.where(field, '>=', from);
  if (to) q = q.where(field, '<=', to);
  return q;
}

// Shared by GET /analytics (JSON) and GET /analytics/export (CSV) so the two
// never disagree about what a given date range actually includes.
async function computeAnalytics({ from, to } = {}) {
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

  return {
    range: { from: from || null, to: to || null },
    users: { total: userDocs.length, active: activeUsers, byRole: usersByRole },
    tickets: { hr: summarizeTicketDocs(hrDocs), it: summarizeTicketDocs(itDocs) },
    approvals: { total: approvalDocs.length, byStatus: approvalsByStatus },
    leave: { total: leaveDocs.length },
  };
}

// GET /api/founder/analytics?from=&to= — ISO date strings, optional.
async function getAnalytics(req, res) {
  const { from, to } = req.query;
  res.json(await computeAnalytics({ from, to }));
}

function csvEscape(value) {
  const s = String(value ?? '');
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

const SYSTEM_SETTINGS_DOC = db.collection('settings').doc('system_config');

const DEFAULT_SYSTEM_SETTINGS = {
  slaHoursIt: 24,
  slaHoursHr: 48,
  workingHoursStart: '09:00',
  workingHoursEnd: '18:00',
  holidays: [],
};

// GET /api/founder/system-settings — readable by anyone logged in, same
// pattern as role-permissions (e.g. a ticket queue may want to show SLA
// countdowns), only Super Admin can write.
async function getSystemSettings(req, res) {
  const doc = await SYSTEM_SETTINGS_DOC.get();
  res.json(doc.exists ? { ...DEFAULT_SYSTEM_SETTINGS, ...doc.data() } : DEFAULT_SYSTEM_SETTINGS);
}

async function updateSystemSettings(req, res) {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'settings object is required' });
  }
  await SYSTEM_SETTINGS_DOC.set(settings, { merge: true });
  await logAudit({ actor: req.user, action: 'update_system_settings', details: settings });
  const doc = await SYSTEM_SETTINGS_DOC.get();
  res.json({ ...DEFAULT_SYSTEM_SETTINGS, ...doc.data() });
}

const ROLE_PERMISSIONS_DOC = db.collection('settings').doc('role_permissions');

// GET /api/founder/role-permissions — every logged-in user reads this to
// gate their own nav (PermissionsContext.canAccess), not just Super Admin.
async function getRolePermissions(req, res) {
  const doc = await ROLE_PERMISSIONS_DOC.get();
  res.json(doc.exists ? doc.data() : {});
}

// PUT /api/founder/role-permissions — Super Admin only. Frontend sends the
// full { [role]: [pageId, ...] } map each time (togglePermission/
// setAllForRole both recompute the whole object), so this replaces wholesale
// rather than merging.
async function updateRolePermissions(req, res) {
  const { permissions } = req.body;
  if (!permissions || typeof permissions !== 'object') {
    return res.status(400).json({ error: 'permissions object is required' });
  }
  await ROLE_PERMISSIONS_DOC.set(permissions);
  await logAudit({ actor: req.user, action: 'update_role_permissions', details: { permissions } });
  res.json({ permissions });
}

const DEPARTMENTS = db.collection('departments');

// GET /api/founder/departments — readable by anyone logged in, same pattern
// as system-settings/role-permissions (dropdowns elsewhere need the list).
// This is its own registry, managed only through this page — it does not
// read or migrate from the free-text `department` field on user records,
// since that field is used inconsistently (job titles, team names) across
// other roles and isn't a reliable source for a clean department list.
async function listDepartments(req, res) {
  const snap = await DEPARTMENTS.get();
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

// POST /api/founder/departments — { name, head? }
async function createDepartment(req, res) {
  const { name, head } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  const dept = { name: name.trim(), head: head || null, active: true, created_at: new Date().toISOString() };
  const ref = await DEPARTMENTS.add(dept);
  await logAudit({ actor: req.user, action: 'create_department', target: { type: 'department', id: ref.id, name: dept.name } });
  res.status(201).json({ id: ref.id, ...dept });
}

// PATCH /api/founder/departments/:id — { name?, head?, active? }
async function updateDepartment(req, res) {
  const { id } = req.params;
  const { name, head, active } = req.body;
  const ref = DEPARTMENTS.doc(id);
  const doc = await ref.get();
  if (!doc.exists) return res.status(404).json({ error: 'Department not found' });

  const before = doc.data();
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (head !== undefined) updates.head = head || null;
  if (active !== undefined) updates.active = !!active;
  await ref.set(updates, { merge: true });

  await logAudit({
    actor: req.user,
    action: 'update_department',
    target: { type: 'department', id, name: before.name },
    details: { before: { name: before.name, head: before.head, active: before.active }, after: updates },
  });
  res.json({ id, ...before, ...updates });
}

// DELETE /api/founder/departments/:id — refuses if any user still points at
// this department's name, same "no orphaned references" spirit as the user
// endpoints refusing to let Super Admin delete their own account.
async function deleteDepartment(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  const ref = DEPARTMENTS.doc(id);
  const doc = await ref.get();
  if (!doc.exists) return res.status(404).json({ error: 'Department not found' });
  const { name } = doc.data();

  const inUse = await db.collection('users').where('department', '==', name).limit(1).get();
  if (!inUse.empty) {
    return res.status(400).json({ error: `${inUse.size >= 1 ? 'At least one' : 'A'} user is still assigned to "${name}" — reassign them first` });
  }

  await ref.delete();
  await logAudit({ actor: req.user, action: 'delete_department', target: { type: 'department', id, name }, details: reason ? { reason } : null });
  res.json({ id, deleted: true });
}

// GET /api/founder/action-permissions — every logged-in user reads this so
// the frontend can hide buttons for actions the backend would 403 anyway;
// only Super Admin can change it. Separate doc from role_permissions (not a
// key inside it) because updateRolePermissions does a full `.set()` of that
// doc from the page-toggle UI — sharing one doc would let a page-visibility
// change silently wipe out the action matrix.
async function getActionPermissions(req, res) {
  const doc = await ACTION_PERMISSIONS_DOC.get();
  res.json(doc.exists ? doc.data() : {});
}

// PUT /api/founder/action-permissions — { permissions: { [role]: { [resource]: [action,...] } } }
async function updateActionPermissions(req, res) {
  const { permissions } = req.body;
  if (!permissions || typeof permissions !== 'object') {
    return res.status(400).json({ error: 'permissions object is required' });
  }
  await ACTION_PERMISSIONS_DOC.set(permissions);
  await logAudit({ actor: req.user, action: 'update_action_permissions', details: { permissions } });
  res.json({ permissions });
}

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

// GET /api/founder/dashboard-overview — Super Admin's landing screen data.
// Deliberately superadmin-only (unlike analytics' broader-but-thinner
// snapshot) since this composes org/IT/HR/security-adjacent numbers in one
// call. Sections the app has no real data source for yet (storage usage,
// failed background jobs, integration sync status, MFA/session security —
// that's the Security Center phase) report `tracked: false` instead of a
// fabricated number, so the UI can show "not tracked yet" honestly.
async function getDashboardOverview(req, res) {
  const dbPingStart = Date.now();
  const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
  // These six are only ever used for a count (`.size`), never per-document
  // fields, so `.count().get()` asks Firestore for just the number instead
  // of transferring every matching document — the other five below need
  // actual field data (role/active, ticket SLA fields, warrantyEnd) so they
  // stay full scans.
  const [usersSnap, deptCount, itSnap, hrSnap, approvalsCount, leaveCount, assetsSnap, policiesDoc, activeSessionsCount, recentFailedLoginsCount, lockedAccountsCount] = await Promise.all([
    db.collection('users').get(),
    db.collection('departments').count().get(),
    db.collection('it_complaints').get(),
    db.collection('hr_complaints').get(),
    db.collection('approvals').where('status', '==', 'pending_founder').count().get(),
    db.collection('leave_requests').where('status', '==', 'Pending').count().get(),
    db.collection('assets').get(),
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

  res.json({
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
  });
}

const SLA_POLICIES_DOC = db.collection('settings').doc('sla_policies');

// Minute-based, per-priority-per-queue — supersedes the flat slaHoursIt/
// slaHoursHr on system_config (which only had one threshold for every
// priority). Numbers mirror the spec's example tiers; there's no "Critical"
// priority in this app's ticket forms (only Low/Medium/High), so that tier
// isn't modeled.
const DEFAULT_SLA_POLICIES = {
  it: {
    High: { responseMinutes: 30, resolutionMinutes: 240 },
    Medium: { responseMinutes: 120, resolutionMinutes: 480 },
    Low: { responseMinutes: 240, resolutionMinutes: 1440 },
  },
  hr: {
    High: { responseMinutes: 30, resolutionMinutes: 240 },
    Medium: { responseMinutes: 120, resolutionMinutes: 480 },
    Low: { responseMinutes: 240, resolutionMinutes: 1440 },
  },
};

// GET /api/founder/sla-policies — readable by anyone logged in (a ticket
// queue may want to show SLA countdowns), only Super Admin can write.
async function getSlaPolicies(req, res) {
  const doc = await SLA_POLICIES_DOC.get();
  res.json(doc.exists ? { ...DEFAULT_SLA_POLICIES, ...doc.data() } : DEFAULT_SLA_POLICIES);
}

async function updateSlaPolicies(req, res) {
  const { policies } = req.body;
  if (!policies || typeof policies !== 'object') {
    return res.status(400).json({ error: 'policies object is required' });
  }
  await SLA_POLICIES_DOC.set(policies);
  await logAudit({ actor: req.user, action: 'update_sla_policies', details: { policies } });
  const doc = await SLA_POLICIES_DOC.get();
  res.json({ ...DEFAULT_SLA_POLICIES, ...doc.data() });
}

// A ticket still open past its priority's resolutionMinutes is breached;
// past 80% of it and still open is near-breach. A completed ticket is
// judged against how long it actually took, not how long it's been open.
function summarizeSlaForQueue(snap, queuePolicies) {
  const now = Date.now();
  let compliant = 0, breached = 0, nearBreach = 0, decided = 0;
  const breaches = [];
  snap.docs.forEach((d) => {
    const t = d.data();
    const policy = queuePolicies[t.priority] || queuePolicies.Medium;
    if (!policy || !t.submitted_at) return;
    if (t.status === 'Completed') {
      if (!t.updated_at) return;
      decided += 1;
      const ms = new Date(t.updated_at) - new Date(t.submitted_at);
      if (Number.isFinite(ms) && ms >= 0) {
        if (ms / 60000 <= policy.resolutionMinutes) compliant += 1;
        else breached += 1;
      }
    } else {
      const ageMinutes = (now - new Date(t.submitted_at).getTime()) / 60000;
      if (!Number.isFinite(ageMinutes)) return;
      if (ageMinutes > policy.resolutionMinutes) {
        breached += 1;
        breaches.push({
          id: d.id, token: t.token, priority: t.priority, status: t.status,
          ageMinutes: Math.round(ageMinutes), resolutionMinutes: policy.resolutionMinutes,
        });
      } else if (ageMinutes > policy.resolutionMinutes * 0.8) {
        nearBreach += 1;
      }
    }
  });
  const compliancePct = decided > 0 ? Math.round((compliant / decided) * 1000) / 10 : null;
  return { total: snap.size, compliant, breached, nearBreach, compliancePct, breaches: breaches.slice(0, 20) };
}

// GET /api/founder/sla-compliance — Super Admin only; per-ticket breach
// detail is more than the general-purpose analytics/dashboard endpoints
// expose.
async function getSlaCompliance(req, res) {
  const [itSnap, hrSnap, policiesDoc] = await Promise.all([
    db.collection('it_complaints').get(),
    db.collection('hr_complaints').get(),
    SLA_POLICIES_DOC.get(),
  ]);
  const policies = policiesDoc.exists ? { ...DEFAULT_SLA_POLICIES, ...policiesDoc.data() } : DEFAULT_SLA_POLICIES;
  res.json({
    it: summarizeSlaForQueue(itSnap, policies.it),
    hr: summarizeSlaForQueue(hrSnap, policies.hr),
  });
}

// GET /api/founder/notification-rules — Super Admin only (no other page
// consumes this; the backend mail-sending code reads loadNotificationRules
// directly, not this HTTP endpoint).
async function getNotificationRules(req, res) {
  res.json(await loadNotificationRules());
}

// PUT /api/founder/notification-rules — { rules: { [trigger]: {...} } }
async function updateNotificationRules(req, res) {
  const { rules } = req.body;
  if (!rules || typeof rules !== 'object') {
    return res.status(400).json({ error: 'rules object is required' });
  }
  await NOTIFICATION_RULES_DOC.set(rules);
  await logAudit({ actor: req.user, action: 'update_notification_rules', details: { rules } });
  res.json(await loadNotificationRules());
}

// GET /api/founder/search?q=term — in-memory substring match over bounded
// reads (limit(300) per collection), not per-field Firestore range queries.
// ponytail: fine at this app's real scale (dozens–low-hundreds of docs per
// collection, seen firsthand in earlier phases); if any collection grows
// into the thousands this needs real indexed search instead.
async function search(req, res) {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ users: [], tickets: [], assets: [], departments: [] });

  const [usersSnap, hrSnap, itSnap, assetsSnap, deptSnap] = await Promise.all([
    db.collection('users').limit(300).get(),
    db.collection('hr_complaints').orderBy('submitted_at', 'desc').limit(200).get(),
    db.collection('it_complaints').orderBy('submitted_at', 'desc').limit(200).get(),
    db.collection('assets').orderBy('created_at', 'desc').limit(200).get(),
    DEPARTMENTS.limit(200).get(),
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

  res.json({ users, tickets, assets, departments });
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
  const [auditSnap, hrSnap, itSnap, approvalsSnap] = await Promise.all([
    AUDIT_LOGS.orderBy('created_at', 'desc').limit(limit).get(),
    db.collection('hr_complaints').orderBy('submitted_at', 'desc').limit(200).get(),
    db.collection('it_complaints').orderBy('submitted_at', 'desc').limit(200).get(),
    db.collection('approvals').orderBy('createdAt', 'desc').limit(200).get(),
  ]);

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
  res.json(events.slice(0, limit));
}

// PATCH /api/founder/dashboard-layout — { widgets: [id, ...] } persisted on
// the caller's own user doc (per-superadmin, not global — each admin's
// widget order/visibility is their own preference, same idea as the
// Overview page's stat cards). No GET needed: the caller already has this
// in their own profile from GET /api/auth/me.
async function updateDashboardLayout(req, res) {
  const { widgets } = req.body;
  if (!Array.isArray(widgets)) return res.status(400).json({ error: 'widgets array is required' });
  await db.collection('users').doc(req.user.id).set({ dashboardLayout: widgets }, { merge: true });
  res.json({ widgets });
}

module.exports = {
  getAllComplaints,
  listUsers,
  updateUserPermissions,
  createUser,
  updateUser,
  setUserActive,
  deleteUser,
  resetUserPassword,
  getAuditLogs,
  getAnalytics,
  getSystemSettings,
  updateSystemSettings,
  getRolePermissions,
  updateRolePermissions,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getActionPermissions,
  updateActionPermissions,
  getDashboardOverview,
  getSlaPolicies,
  updateSlaPolicies,
  getSlaCompliance,
  getNotificationRules,
  updateNotificationRules,
  getAnalyticsCsv,
  search,
  getActivityTimeline,
  updateDashboardLayout,
};
