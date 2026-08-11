const { auth, db } = require('../config/firebase');

// Roles a Founder is allowed to hand-create an account for — matches the
// TOGGLABLE_ROLES the frontend's Role Permissions page offers a tab for.
// Deliberately excludes 'founder' (there's no self-service way to mint
// another founder from this screen).
const ASSIGNABLE_ROLES = ['it', 'hr', 'coordinator', 'employee'];

// GET /api/founder/complaints — returns all HR + IT complaints combined
async function getAllComplaints(req, res) {
  const [hrSnap, itSnap] = await Promise.all([
    db.collection('hr_complaints').get(),
    db.collection('it_complaints').get(),
  ]);

  const hrTagged = hrSnap.docs.map(d => ({ id: d.id, ...d.data(), dept_tag: 'HR' }));
  const itTagged = itSnap.docs.map(d => ({ id: d.id, ...d.data(), dept_tag: 'IT' }));

  // Merge and sort by submitted_at descending
  const all = [...hrTagged, ...itTagged].sort(
    (a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)
  );

  res.json(all);
}

// GET /api/founder/users?role=it — no passwords stored here, Firebase Auth
// owns credentials; this collection is just profile + permission data.
async function listUsers(req, res) {
  const { role } = req.query;
  const snap = await db.collection('users').get();
  const users = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((u) => !role || u.role === role)
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
// a Founder assign the role explicitly, since they're deliberately creating
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

module.exports = { getAllComplaints, listUsers, updateUserPermissions, createUser };
