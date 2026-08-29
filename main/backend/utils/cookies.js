const crypto = require('crypto');

// Vercel sets this in every deployed environment (preview and prod); local
// dev never has it. Cross-origin cookies (frontend and backend are separate
// Vercel projects/domains) require SameSite=None + Secure, which in turn
// requires HTTPS — that's only true once deployed. Locally, frontend and
// backend share the "localhost" site (SameSite only cares about the
// registrable domain, not the port), so Lax + non-Secure works over plain
// http://localhost.
const isDeployed = Boolean(process.env.VERCEL);

const AUTH_COOKIE = 'fute_token';
const REFRESH_COOKIE = 'fute_refresh';
const CSRF_COOKIE = 'fute_csrf';

const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000; // mirrors utils/jwt.js's ACCESS_TOKEN_TTL
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // mirrors utils/sessions.js's REFRESH_TTL_MS

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: isDeployed,
    sameSite: isDeployed ? 'none' : 'lax',
    path: '/',
  };
}

// Always short-lived regardless of "remember me" — that checkbox is about
// how long the *refresh* cookie survives closing the browser, not about
// widening the access token's own exposure window if it ever leaked.
function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, { ...baseCookieOptions(), maxAge: ACCESS_COOKIE_MAX_AGE });
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, baseCookieOptions());
}

// Scoped to /api/auth — the refresh token is only ever needed by the refresh
// and logout endpoints, so there's no reason for it to ride along on every
// other request the way the access cookie does.
function refreshCookieOptions(remember) {
  const options = { ...baseCookieOptions(), path: '/api/auth' };
  if (remember) options.maxAge = REFRESH_COOKIE_MAX_AGE;
  // else: no maxAge => a true browser-session cookie, dropped when the
  // browser (not just the tab) closes — same as the old "don't remember me"
  // behavior, now expressed as cookie lifetime instead of storage choice.
  return options;
}

function setRefreshCookie(res, token, remember) {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions(remember));
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { ...baseCookieOptions(), path: '/api/auth' });
}

// Deliberately NOT httpOnly — csrfMiddleware.js's double-submit check relies
// on the frontend being able to read this value (via document.cookie) and
// echo it back in a header. That's safe specifically because a cross-site
// attacker's page can't read a cookie that belongs to our origin, even
// though the browser will still *send* it along automatically — reading is
// what same-origin policy actually blocks, not sending.
//
// Its lifetime mirrors the refresh cookie's, not the access cookie's — it
// needs to still be present whenever the refresh cookie is (i.e. for as
// long as "remember me" keeps the session alive), or every mutating request
// after an access-token rotation would fail CSRF for having no cookie left
// to match. Was pinned to the previous authController.js's login/register
// calls, not tied to the actual session, until this refresh-flow change.
function setCsrfCookie(res, remember) {
  const token = crypto.randomBytes(24).toString('hex');
  const options = { ...baseCookieOptions(), httpOnly: false };
  if (remember) options.maxAge = REFRESH_COOKIE_MAX_AGE;
  res.cookie(CSRF_COOKIE, token, options);
  return token;
}

function clearCsrfCookie(res) {
  res.clearCookie(CSRF_COOKIE, { ...baseCookieOptions(), httpOnly: false });
}

module.exports = {
  AUTH_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
  setAuthCookie,
  clearAuthCookie,
  setRefreshCookie,
  clearRefreshCookie,
  setCsrfCookie,
  clearCsrfCookie,
};
