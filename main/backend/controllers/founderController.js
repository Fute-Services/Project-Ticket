const { auth, db } = require('../config/firebase');
const { logAudit, AUDIT_LOGS } = require('../utils/auditLog');

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
    db.collection('hr_complaints').limit(200).get(),
    db.collection('it_complaints').limit(200).get(),
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
  const { active } = req.body;
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
  });

  res.json({ id: uid, active });
}

// DELETE /api/founder/users/:uid — removes the Firebase Auth account and
// Firestore profile. Irreversible, unlike deactivate.
async function deleteUser(req, res) {
  const { uid } = req.params;
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
async function getAnalytics(req, res) {
  const [usersSnap, hrSnap, itSnap, approvalsSnap, leaveSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('hr_complaints').get(),
    db.collection('it_complaints').get(),
    db.collection('approvals').get(),
    db.collection('leaves').get().catch(() => ({ docs: [] })),
  ]);

  const usersByRole = {};
  let activeUsers = 0;
  usersSnap.docs.forEach((d) => {
    const u = d.data();
    usersByRole[u.role] = (usersByRole[u.role] || 0) + 1;
    if (u.active !== false) activeUsers += 1;
  });

  function summarizeTickets(snap) {
    const byStatus = {};
    const resolutionMs = [];
    snap.docs.forEach((d) => {
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
    return { total: snap.size, byStatus, avgResolutionHours };
  }

  const approvalsByStatus = {};
  approvalsSnap.docs.forEach((d) => {
    const a = d.data();
    approvalsByStatus[a.status] = (approvalsByStatus[a.status] || 0) + 1;
  });

  res.json({
    users: { total: usersSnap.size, active: activeUsers, byRole: usersByRole },
    tickets: { hr: summarizeTickets(hrSnap), it: summarizeTickets(itSnap) },
    approvals: { total: approvalsSnap.size, byStatus: approvalsByStatus },
    leave: { total: leaveSnap.docs ? leaveSnap.docs.length : leaveSnap.size },
  });
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
};
