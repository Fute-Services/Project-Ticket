const { auth, db, usingEmulator } = require('../config/firebase');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Toggle: flip to `true` to require the password again — login() branches
// on this below, both code paths are kept intact so switching back is a
// one-line change, not a rewrite.
const PASSWORD_LOGIN_ENABLED = true;

// The emulator exposes the same Identity Toolkit REST surface locally —
// any non-empty `key` works against it, unlike the real endpoint which
// requires the project's actual Web API key.
const IDENTITY_TOOLKIT_BASE = usingEmulator
  ? `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1`
  : 'https://identitytoolkit.googleapis.com/v1';
const IDENTITY_TOOLKIT_KEY = usingEmulator ? 'emulator-key' : process.env.FIREBASE_API_KEY;

// Detect role from email pattern
function detectRole(email) {
  if (/hr\.fute/i.test(email)) return 'hr';
  if (/system\.fute/i.test(email) || /system\.futeservice/i.test(email)) return 'it';
  if (/coordinator\.fute/i.test(email)) return 'coordinator';
  return 'employee'; // founder is set manually in DB
}

// POST /api/auth/register
async function register(req, res) {
  const { email, password, full_name, department } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'email, password and full_name are required' });
  }

  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password, displayName: full_name });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const role = detectRole(email);

  await db.collection('users').doc(userRecord.uid).set({
    email,
    full_name,
    role,
    department: department || null,
    created_at: new Date().toISOString(),
  });

  const token = jwt.sign(
    { id: userRecord.uid, email, role, full_name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({ id: userRecord.uid, token, role, full_name, email, permissionOverrides: {} });
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  let uid;

  if (PASSWORD_LOGIN_ENABLED) {
    if (!password) return res.status(400).json({ error: 'email and password required' });

    // Verify password via Firebase Auth REST API (Admin SDK can't verify passwords directly)
    const resp = await fetch(
      `${IDENTITY_TOOLKIT_BASE}/accounts:signInWithPassword?key=${IDENTITY_TOOLKIT_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const authData = await resp.json();
    if (!resp.ok) return res.status(401).json({ error: 'Invalid credentials' });
    uid = authData.localId;
  } else {
    // Password check disabled — email alone identifies the account. Still
    // routes through Firebase Auth (not just Firestore) so a nonexistent
    // account 401s the same way it would with the password path.
    try {
      const userRecord = await auth.getUserByEmail(email);
      uid = userRecord.uid;
    } catch {
      return res.status(401).json({ error: 'No account found for that email' });
    }
  }

  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) return res.status(400).json({ error: 'User profile not found' });
  const user = userDoc.data();

  const token = jwt.sign(
    { id: uid, email: user.email, role: user.role, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    id: uid,
    token,
    role: user.role,
    full_name: user.full_name,
    email: user.email,
    department: user.department || user.designation || '',
    designation: user.designation || user.department || '',
    employeeId: user.employee_id || user.employeeId || '',
    permissionOverrides: user.permissionOverrides || {},
  });
}

// GET /api/auth/me — re-fetches the caller's own profile (role, department,
// permissionOverrides may have changed since they logged in; AuthContext
// calls this on reload rather than trusting a possibly-stale cached copy).
async function getMe(req, res) {
  const userDoc = await db.collection('users').doc(req.user.id).get();
  if (!userDoc.exists) return res.status(404).json({ error: 'User profile not found' });
  const user = userDoc.data();
  res.json({
    id: userDoc.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    department: user.department || user.designation || '',
    designation: user.designation || user.department || '',
    employeeId: user.employee_id || user.employeeId || '',
    permissionOverrides: user.permissionOverrides || {},
  });
}

module.exports = { register, login, getMe };
