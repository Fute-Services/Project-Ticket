const { CSRF_COOKIE } = require('../utils/cookies');
const { fail } = require('../utils/respond');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// Login/register happen before any session/CSRF cookie exists yet — nothing
// to compare a header against. A forged cross-site login can't read the
// response anyway (CORS), and there's no existing session for it to hijack,
// so there's nothing here worth protecting the way there is on every
// authenticated mutation below.
//
// /api/auth/refresh is exempt for a different reason: it takes no
// attacker-controlled input (the refresh cookie itself, sent automatically
// and unreadable/unforgeable cross-site, IS the credential this endpoint
// checks) and its response never reaches the attacker's page (CORS) — a
// forged call just silently rotates the victim's own session, which isn't
// something an attacker can leverage.
const EXEMPT_PATHS = new Set(['/api/auth/login', '/api/auth/register', '/api/auth/refresh']);

// Double-submit cookie check. Session auth just switched from a
// JS-attached Authorization header (immune to CSRF — a forged cross-site
// request can't set custom headers or read anything to put in one) to a
// cookie. Because the frontend and backend are on separate origins, the
// cookie has to be SameSite=None to be sent at all, which also means it's
// sent on cross-site requests — exactly what SameSite normally exists to
// prevent. This closes that gap back up: a forged request from another
// origin can't read our (non-httpOnly, same-origin-only-readable) CSRF
// cookie, so it can't produce a matching header value no matter how it
// tricks a logged-in browser into sending the request.
function csrfMiddleware(req, res, next) {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers['x-csrf-token'];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return fail(res, { status: 403, message: 'CSRF token missing or invalid', code: 'CSRF_INVALID' });
  }
  next();
}

module.exports = csrfMiddleware;
