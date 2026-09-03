const crypto = require('crypto');
const { auth, db } = require('../config/db');
const { signAccessToken } = require('../utils/jwt');
const { createSession, SESSIONS, clearRevokedCache, consumeRefreshToken, hashToken } = require('../utils/sessions');
const { ok, created, fail } = require('../utils/respond');
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
const FAILED_LOGINS = db.collection('failed_logins');

// Toggle: flip to `true` to require the password again — login() branches
// on this below, both code paths are kept intact so switching back is a
// one-line change, not a rewrite.
const PASSWORD_LOGIN_ENABLED = true;

// Issues a fresh access+refresh pair for a session and sets all three
// cookies (access, refresh, csrf) — the one place that sequence happens, so
// register/login/refresh can't drift out of sync with each other. Returns
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

// POST /api/auth/register
async function register(req, res) {
  const { email, password, full_name, department } = req.body;
  if (!email || !password || !full_name) {
    return fail(res, { status: 400, message: 'email, password and full_name are required', code: 'VALIDATION_ERROR' });
  }
  // Same floor as the Super Admin's own password-reset flow (superAdminUserController.js)
  // — self-registration used to accept any non-empty string, relying only on
  // Firebase Auth's weaker 6-char default.
  if (password.length < 10) {
    return fail(res, { status: 400, message: 'password must be at least 10 characters', code: 'VALIDATION_ERROR' });
  }

  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password, displayName: full_name });
  } catch (err) {
    return fail(res, { status: 400, message: err.message, code: 'REGISTRATION_FAILED' });
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

  const rawRefreshToken = crypto.randomBytes(32).toString('hex');
  const session = await createSession({
    uid: userRecord.uid,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    refreshToken: rawRefreshToken,
    remember: true,
  });

  // The access token now lives only in an httpOnly cookie — never in the
  // response body — so no JS on this page (including a future XSS bug) can
  // read it. csrfToken is different: it's already readable via its own
  // (deliberately non-httpOnly) cookie, so returning it here too isn't a new
  // exposure — see the comment on issueSessionCookies.
  const csrfToken = issueSessionCookies(res, { id: userRecord.uid, email, role, full_name, sessionId: session.id, remember: true });
  setRefreshCookie(res, rawRefreshToken, true);

  created(res, { id: userRecord.uid, role, full_name, email, permissionOverrides: {}, csrfToken }, 'Account created successfully');
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
    return fail(res, { status: 401, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
  }

  const userRef = db.collection('users').doc(uid);
  const preSnap = await userRef.get();
  if (!preSnap.exists) return fail(res, { status: 400, message: 'User profile not found', code: 'NOT_FOUND' });
  const preUser = preSnap.data();

  if (preUser.locked) {
    return fail(res, {
      status: 423,
      message: 'Account locked after too many failed login attempts — ask a Super Admin to unlock it',
      code: 'ACCOUNT_LOCKED',
    });
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
// handing the value back through a response body - which login/register/
// refresh already do - is the only reliable channel left. /me runs on
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

module.exports = { register, login, refresh, getMe, verifyPassword, logout };
