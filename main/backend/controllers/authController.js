const { auth, db, usingEmulator } = require('../config/firebase');
const jwt = require('jsonwebtoken');
const { createSession, SESSIONS, clearRevokedCache } = require('../utils/sessions');
require('dotenv').config();

// Accounts lock after this many consecutive failed password attempts, until
// a Super Admin unlocks them from the Security Center — a fixed in-code
// threshold rather than a configurable setting, since tuning it isn't a
// real operational need yet.
const LOCK_THRESHOLD = 5;
const FAILED_LOGINS = db.collection('failed_logins');

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

  // Self-registration can only ever create a plain employee account —
  // privileged roles (hr/it/coordinator/founder) are granted exclusively by
  // an authenticated founder via POST /api/founder/users. Role used to be
  // guessed from the caller-supplied email string itself, which let anyone
  // grant themselves hr/it/coordinator by picking a matching email.
  const role = 'employee';

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
  if (PASSWORD_LOGIN_ENABLED && !password) {
    return res.status(400).json({ error: 'email and password required' });
  }

  // Resolve the account before touching the password, so a lock can be
  // checked up front and a failed attempt can still be recorded against the
  // right user even when the password itself is wrong.
  let uid;
  try {
    const userRecord = await auth.getUserByEmail(email);
    uid = userRecord.uid;
  } catch {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const userRef = db.collection('users').doc(uid);
  const preSnap = await userRef.get();
  if (!preSnap.exists) return res.status(400).json({ error: 'User profile not found' });
  const preUser = preSnap.data();

  if (preUser.locked) {
    return res.status(423).json({ error: 'Account locked after too many failed login attempts — ask a Super Admin to unlock it' });
  }

  if (PASSWORD_LOGIN_ENABLED) {
    // Verify password via Firebase Auth REST API (Admin SDK can't verify passwords directly)
    const resp = await fetch(
      `${IDENTITY_TOOLKIT_BASE}/accounts:signInWithPassword?key=${IDENTITY_TOOLKIT_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    if (!resp.ok) {
      const attempts = (preUser.failedLoginAttempts || 0) + 1;
      const updates = { failedLoginAttempts: attempts };
      if (attempts >= LOCK_THRESHOLD) {
        updates.locked = true;
        updates.lockedAt = new Date().toISOString();
      }
      await userRef.set(updates, { merge: true });
      await FAILED_LOGINS.add({ uid, email, ip: req.ip || null, at: new Date().toISOString() });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  }

  const user = preUser;
  if (user.active === false) return res.status(403).json({ error: 'This account has been deactivated' });

  if (user.failedLoginAttempts) {
    await userRef.set({ failedLoginAttempts: 0 }, { merge: true });
  }

  const session = await createSession({ uid, ip: req.ip, userAgent: req.headers['user-agent'] });
  const token = jwt.sign(
    { id: uid, email: user.email, role: user.role, full_name: user.full_name, sid: session.id },
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
    dashboardLayout: user.dashboardLayout || null,
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
    dashboardLayout: user.dashboardLayout || null,
  });
}

// POST /api/auth/verify-password — re-authentication for risk-tiered
// confirm dialogs (delete user, force-logout, etc.). Verifies against the
// CALLER's own email (req.user, from the JWT) — never a caller-supplied
// email — so this can't be used to test another account's password.
async function verifyPassword(req, res) {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'password required' });

  const resp = await fetch(
    `${IDENTITY_TOOLKIT_BASE}/accounts:signInWithPassword?key=${IDENTITY_TOOLKIT_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: req.user.email, password, returnSecureToken: true }),
    }
  );
  res.json({ valid: resp.ok });
}

// POST /api/auth/logout — revokes the caller's own session so the JWT stops
// working immediately instead of staying valid for the rest of its 7-day
// life. Without this, clicking Logout only cleared the browser's copy of the
// token; anyone else holding it (devtools, a shared machine, a synced
// backup) could keep using it. A token issued before session tracking
// existed has no `sid` — nothing to revoke, so this is a no-op for it.
async function logout(req, res) {
  if (req.user.sid) {
    await SESSIONS.doc(req.user.sid).set({ revoked: true, revokedAt: new Date().toISOString() }, { merge: true });
    clearRevokedCache(req.user.sid);
  }
  res.json({ loggedOut: true });
}

module.exports = { register, login, getMe, verifyPassword, logout };
