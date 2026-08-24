const { auth, db } = require('../config/firebase');
const { UNPAGINATED_READ_LIMIT, FOUNDER_LIST_CAP } = require('../utils/constants');
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

// GET /api/founder/complaints — returns all HR + IT complaints combined.
// No `.orderBy('submitted_at')` on either query — Firestore silently drops
// any document missing the ordered field from the result set entirely; the
// merge below already re-sorts in JS, so nothing needs it query-side.
async function getAllComplaints(req, res) {
  const [hrSnap, itSnap] = await Promise.all([
    db.collection('hr_complaints').limit(FOUNDER_LIST_CAP).get(),
    db.collection('it_complaints').limit(FOUNDER_LIST_CAP).get(),
  ]);

  const hrTagged = hrSnap.docs.map(d => ({ id: d.id, ...d.data(), dept_tag: 'HR' }));
  const itTagged = itSnap.docs.map(d => ({ id: d.id, ...d.data(), dept_tag: 'IT' }));

  // Merge and sort by submitted_at descending
  const all = [...hrTagged, ...itTagged].sort(
    (a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0)
  );

  // Neither collection query paginates (the merge/sort below needs both in
  // full to interleave correctly), so once either side hits the cap this
  // view is quietly missing records rather than showing everything — surface
  // that instead of staying silent about it.
  if (hrSnap.size === FOUNDER_LIST_CAP || itSnap.size === FOUNDER_LIST_CAP) {
    res.setHeader('X-Results-Truncated', 'true');
  }

  const enriched = await enrichWithUserRole(all);
  res.json(enriched);
}

// GET /api/founder/users?role=it — no passwords stored here, Firebase Auth
// owns credentials; this collection is just profile + permission data.
// active defaults to true for accounts created before the deactivate
// feature existed (no `active` field written yet).
async function listUsers(req, res) {
  const { role } = req.query;
  const query = role ? db.collection('users').where('role', '==', role) : db.collection('users').limit(UNPAGINATED_READ_LIMIT);
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
  // A stronger floor than self-registration: this is the password set right
  // after an account lockout, so a weak reset here undermines the lockout
  // protection it's meant to restore.
  if (!password || password.length < 10) {
    return res.status(400).json({ error: 'password (min 10 chars) is required' });
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
};
