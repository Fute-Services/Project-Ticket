const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { auth, db } = require('../config/db');
const { signAccessToken } = require('../utils/jwt');
const { createSession, SESSIONS, clearRevokedCache, consumeRefreshToken, hashToken } = require('../utils/sessions');
const { ok, fail } = require('../utils/respond');
const {
  setAuthCookie,
  clearAuthCookie,
  setRefreshCookie,
  clearRefreshCookie,
  setCsrfCookie,
  clearCsrfCookie,
  REFRESH_COOKIE,
  CSRF_COOKIE,
} = require('../utils/cookies');
require('dotenv').config();

// Accounts lock after this many consecutive failed password attempts, until
// a Super Admin unlocks them from the Security Center — a fixed in-code
// threshold rather than a configurable setting, since tuning it isn't a
// real operational need yet.
const LOCK_THRESHOLD = 5;
// Anyone who knows a staff email address (every colleague does) could
// otherwise lock that account forever with 5 bad guesses, with no
// self-service way back in — including locking out the Super Admin who'd
// need to undo it. Auto-expiring the lock bounds that to a 15-minute
// inconvenience for the real owner instead of a permanent denial-of-service.
const LOCK_DURATION_MS = 15 * 60 * 1000;
const FAILED_LOGINS = db.collection('failed_logins');
// An unknown email used to fail instantly, while a known one took as long as
// a real bcrypt compare (config/db.js's auth.verifyPassword) — that
// difference is measurable and lets someone confirm which email addresses
// have accounts. Comparing against this fixed dummy hash on the unknown-email
// path costs the same ~bcrypt round-trip, so both paths take about the same
// time. The hash itself is meaningless — bcrypt of a fixed placeholder
// string, never a real password.
const DUMMY_PASSWORD_HASH = '$2a$10$.xtLnHGjyShYVNhvBbVagOVFjRiM/OxUKt6kJNDSAz5DTO.T/th9.';

// Toggle: flip to `true` to require the password again — login() branches
// on this below, both code paths are kept intact so switching back is a
// one-line change, not a rewrite.
const PASSWORD_LOGIN_ENABLED = true;

// Issues a fresh access+refresh pair for a session and sets all three
// cookies (access, refresh, csrf) — the one place that sequence happens, so
// login/refresh can't drift out of sync with each other. Returns
// the csrf token too (not just setting the cookie) — callers put it in the
// JSON response body so the frontend can cache it in JS memory instead of
// re-reading document.cookie on every request, which used to race against
// a concurrent silent refresh rotating the cookie's value mid-flight (see
// docs — the "CSRF token missing or invalid" intermittent failure).
function issueSessionCookies(res, { id, email, role, full_name, sessionId, remember }) {
  const accessToken = signAccessToken({ id, email, role, full_name, sid: sessionId });
  setAuthCookie(res, accessToken);
  return setCsrfCookie(res, remember);
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password, remember = true } = req.body;
  if (!email) return fail(res, { status: 400, message: 'email required', code: 'VALIDATION_ERROR' });
  if (PASSWORD_LOGIN_ENABLED && !password) {
    return fail(res, { status: 400, message: 'email and password required', code: 'VALIDATION_ERROR' });
  }

  // Resolve the account before touching the password, so a lock can be
  // checked up front and a failed attempt can still be recorded against the
  // right user even when the password itself is wrong.
  let uid;
  try {
    const userRecord = await auth.getUserByEmail(email);
    uid = userRecord.uid;
  } catch {
    // Matches the known-email path's full shape, not just its bcrypt cost:
    // that path reads _auth_credentials twice (once here via getUserByEmail,
    // again inside auth.verifyPassword) plus the `users` profile doc below,
    // before ever reaching its own bcrypt.compare. Two real lookups on
    // non-existent keys (same indexed-miss cost as a real one) plus the
    // dummy compare keeps this path's total shape — not just one number —
    // close enough that timing alone can't distinguish them.
    if (PASSWORD_LOGIN_ENABLED) {
      await Promise.all([
        db.collection('_auth_credentials').doc('__timing_probe__').get(),
        db.collection('users').doc('__timing_probe__').get(),
        bcrypt.compare(password, DUMMY_PASSWORD_HASH),
      ]);
    }
    return fail(res, { status: 401, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
  }

  const userRef = db.collection('users').doc(uid);
  const preSnap = await userRef.get();
  if (!preSnap.exists) return fail(res, { status: 400, message: 'User profile not found', code: 'NOT_FOUND' });
  const preUser = preSnap.data();

  if (preUser.locked) {
    const lockedAtMs = preUser.lockedAt ? new Date(preUser.lockedAt).getTime() : 0;
    const lockExpired = Date.now() - lockedAtMs >= LOCK_DURATION_MS;
    if (!lockExpired) {
      return fail(res, {
        status: 423,
        message: 'Account locked after too many failed login attempts — try again in 15 minutes, or ask a Super Admin to unlock it',
        code: 'ACCOUNT_LOCKED',
      });
    }
    // Lock has aged out — clear it so this attempt is evaluated normally
    // instead of permanently blocking on a lock nobody ever lifts.
    await userRef.set({ locked: false, failedLoginAttempts: 0 }, { merge: true });
    preUser.locked = false;
    preUser.failedLoginAttempts = 0;
  }

  if (PASSWORD_LOGIN_ENABLED) {
    const valid = await auth.verifyPassword(email, password);
    if (!valid) {
      const attempts = (preUser.failedLoginAttempts || 0) + 1;
      const updates = { failedLoginAttempts: attempts };
      if (attempts >= LOCK_THRESHOLD) {
        updates.locked = true;
        updates.lockedAt = new Date().toISOString();
      }
      await userRef.set(updates, { merge: true });
      await FAILED_LOGINS.add({ uid, email, ip: req.ip || null, at: new Date().toISOString() });
      return fail(res, { status: 401, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }
  }

  const user = preUser;
  if (user.active === false) return fail(res, { status: 403, message: 'This account has been deactivated', code: 'ACCOUNT_DEACTIVATED' });

  if (user.failedLoginAttempts) {
    await userRef.set({ failedLoginAttempts: 0 }, { merge: true });
  }

  const rawRefreshToken = crypto.randomBytes(32).toString('hex');
  const session = await createSession({
    uid,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    refreshToken: rawRefreshToken,
    remember,
  });

  // "Remember me" used to pick localStorage vs sessionStorage on the
  // frontend; now it governs the refresh+csrf cookies' own maxAge (persist
  // past closing the browser) vs none (a true browser-session cookie) — see
  // cookies.js. The access cookie itself is always short-lived either way.
  const csrfToken = issueSessionCookies(res, { id: uid, email: user.email, role: user.role, full_name: user.full_name, sessionId: session.id, remember });
  setRefreshCookie(res, rawRefreshToken, remember);

  ok(res, {
    id: uid,
    role: user.role,
    full_name: user.full_name,
    email: user.email,
    department: user.department || user.designation || '',
    designation: user.designation || user.department || '',
    employeeId: user.employee_id || user.employeeId || '',
    permissionOverrides: user.permissionOverrides || {},
    dashboardLayout: user.dashboardLayout || null,
    csrfToken,
  }, { message: 'Login successful' });
}

// POST /api/auth/refresh — exchanges the (long-lived) refresh cookie for a
// new short-lived access token, transparently, before the old one's 15
// minutes run out. Called by the frontend's response interceptor
// (utils/api.js) the moment any request 401s, not on a timer — so an idle
// tab never bothers refreshing, and an active one never notices the access
// token expiring at all.
async function refresh(req, res) {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (!rawToken) return fail(res, { status: 401, message: 'No refresh token provided', code: 'UNAUTHORIZED' });

  const result = await consumeRefreshToken(hashToken(rawToken), { ip: req.ip, userAgent: req.headers['user-agent'] });
  if (!result.ok) {
    // Whatever the reason (expired, revoked, or a reused/stolen token just
    // got the whole session revoked) — the client's cookies are stale
    // either way, so clear them rather than leave a cookie the server will
    // never accept again sitting in the browser.
    clearAuthCookie(res);
    clearRefreshCookie(res);
    clearCsrfCookie(res);
    return fail(res, { status: 401, message: 'Session expired — please log in again', code: 'SESSION_EXPIRED' });
  }

  const userDoc = await db.collection('users').doc(result.uid).get();
  if (!userDoc.exists || userDoc.data().active === false) {
    clearAuthCookie(res);
    clearRefreshCookie(res);
    clearCsrfCookie(res);
    return fail(res, { status: 401, message: 'Account no longer available', code: 'ACCOUNT_NOT_FOUND' });
  }
  const user = userDoc.data();
  const remember = result.session.remember;

  const csrfToken = issueSessionCookies(res, { id: result.uid, email: user.email, role: user.role, full_name: user.full_name, sessionId: result.session.id, remember });
  setRefreshCookie(res, result.newRawRefreshToken, remember);

  ok(res, { refreshed: true, csrfToken }, { message: 'Session refreshed' });
}

// GET /api/auth/me — re-fetches the caller's own profile (role, department,
// permissionOverrides may have changed since they logged in; AuthContext
// calls this on reload rather than trusting a possibly-stale cached copy).
//
// Also echoes back the caller's own current CSRF cookie value (not a new
// one - just reads what the browser already sent on req.cookies, same
// value, no rotation). This turned out to be necessary, not just a nice-to-
// have: some browsers now block page JS from reading a cross-site cookie
// via document.cookie entirely (confirmed live - it returned '' while the
// same cookie was still visibly attached to every request), even though
// it's explicitly non-httpOnly and still sent to the server correctly. The
// server can always read req.cookies regardless of that restriction, so
// handing the value back through a response body - which login/refresh
// already do - is the only reliable channel left. /me runs on
// every page load, which is what closes the gap for a tab that's already
// logged in and never re-runs login/refresh on its own.
async function getMe(req, res) {
  const userDoc = await db.collection('users').doc(req.user.id).get();
  if (!userDoc.exists) return fail(res, { status: 404, message: 'User profile not found', code: 'NOT_FOUND' });
  const user = userDoc.data();
  ok(res, {
    id: userDoc.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    department: user.department || user.designation || '',
    designation: user.designation || user.department || '',
    employeeId: user.employee_id || user.employeeId || '',
    permissionOverrides: user.permissionOverrides || {},
    dashboardLayout: user.dashboardLayout || null,
    csrfToken: req.cookies?.[CSRF_COOKIE] || null,
  });
}

// POST /api/auth/verify-password — re-authentication for risk-tiered
// confirm dialogs (delete user, force-logout, etc.). Verifies against the
// CALLER's own email (req.user, from the JWT) — never a caller-supplied
// email — so this can't be used to test another account's password.
async function verifyPassword(req, res) {
  const { password } = req.body;
  if (!password) return fail(res, { status: 400, message: 'password required', code: 'VALIDATION_ERROR' });

  const valid = await auth.verifyPassword(req.user.email, password);
  ok(res, { valid });
}

// POST /api/auth/logout — revokes the caller's own session so neither the
// access nor the refresh token keeps working, instead of only clearing the
// browser's copy of them. A token issued before session tracking existed
// has no `sid` — nothing to revoke, so this is a no-op for it.
async function logout(req, res) {
  if (req.user.sid) {
    await SESSIONS.doc(req.user.sid).set({ revoked: true, revokedAt: new Date().toISOString() }, { merge: true });
    clearRevokedCache(req.user.sid);
  }
  clearAuthCookie(res);
  clearRefreshCookie(res);
  clearCsrfCookie(res);
  ok(res, { loggedOut: true }, { message: 'Logged out successfully' });
}

module.exports = { login, refresh, getMe, verifyPassword, logout };
