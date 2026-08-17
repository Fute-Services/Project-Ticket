const { auth, db } = require('../config/firebase');

// Roles Super Admin is allowed to hand-create an account for from the Role
// Permissions page. Deliberately excludes 'founder' and 'superadmin' —
// there's no self-service way to mint either from this screen.
const ASSIGNABLE_ROLES = ['it', 'hr', 'coordinator', 'employee'];

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
  };
  await db.collection('users').doc(userRecord.uid).set(profile);

  res.status(201).json({ id: userRecord.uid, ...profile });
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
  res.json({ permissions });
}

module.exports = { getAllComplaints, listUsers, updateUserPermissions, createUser, getRolePermissions, updateRolePermissions };
