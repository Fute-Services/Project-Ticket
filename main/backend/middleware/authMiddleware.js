const { db } = require('../config/firebase');
const { isSessionRevoked } = require('../utils/sessions');
const { fail } = require('../utils/respond');
const { AUTH_COOKIE } = require('../utils/cookies');
const { verifyAccessToken } = require('../utils/jwt');

// Re-checking every request against Firestore (no caching at all) blew
// through the project's Firestore read quota within minutes under normal
// traffic ("8 RESOURCE_EXHAUSTED: Quota exceeded" on every endpoint,
// including login) — a much heavier cost than the stale-token risk it was
// meant to close. This short-lived per-process cache keeps that same
// protection (a deleted/demoted account loses access within CACHE_MS,
// not up to a full day) while cutting the read volume by roughly a
// cache-hit-rate's worth for any user making more than one request a
// minute.
const CACHE_MS = 60_000;
const profileCache = new Map(); // uid -> { data, expiresAt }

async function getProfile(uid) {
  const cached = profileCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const snap = await db.collection('users').doc(uid).get();
  const data = snap.exists ? snap.data() : null;
  profileCache.set(uid, { data, expiresAt: Date.now() + CACHE_MS });
  return data;
}

// Verifies the JWT, then re-checks the account against Firestore (via the
// cache above) so a role change or a deleted account takes effect within a
// minute instead of waiting out the token's full lifetime.
//
// The token now lives in an httpOnly cookie the browser attaches
// automatically. The Authorization-header path stays as a fallback — it's
// free to support (a valid signed JWT is equally trustworthy either way) and
// covers any non-browser API client that isn't cookie-based.
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = req.cookies?.[AUTH_COOKIE] || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);
  if (!token) {
    return fail(res, { status: 401, message: 'No token provided', code: 'UNAUTHORIZED' });
  }
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    // Covers a genuinely invalid/tampered token AND the expected, frequent
    // case of a naturally-expired 15-minute access token — either way the
    // frontend's response interceptor (utils/api.js) is what's supposed to
    // catch this 401 and silently call /api/auth/refresh before the user
    // ever notices.
    return fail(res, { status: 401, message: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }

  const data = await getProfile(decoded.id);
  if (!data) {
    return fail(res, { status: 401, message: 'Account no longer exists', code: 'ACCOUNT_NOT_FOUND' });
  }
  if (data.active === false) {
    return fail(res, { status: 403, message: 'This account has been deactivated', code: 'ACCOUNT_DEACTIVATED' });
  }
  if (await isSessionRevoked(decoded.sid)) {
    return fail(res, {
      status: 401,
      message: 'This session has been signed out remotely — please log in again',
      code: 'SESSION_REVOKED',
    });
  }

  req.user = {
    id: decoded.id,
    email: data.email,
    role: data.role,
    full_name: data.full_name,
    sid: decoded.sid,
    employeeId: data.employee_id || data.employeeId || '',
  };
  next();
}

module.exports = authMiddleware;
