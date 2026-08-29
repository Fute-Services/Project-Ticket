const { fail } = require('../utils/respond');

// With express-async-errors (loaded in server.js before any route), this
// also receives rejected promises from any async route handler, not just
// synchronous throws — a controller doesn't need its own try/catch just to
// avoid a hung request.
function errorMiddleware(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = err.status || (err.message === 'Not allowed by CORS' ? 403 : 500);
  // Controllers that intentionally throw Object.assign(new Error(...), {status})
  // want that message shown to the client. Anything else is an unexpected
  // error (Firestore/driver internals, TypeErrors, etc.) whose raw message
  // could leak internal details — send a generic message for those instead,
  // the real error is already logged above.
  const message = err.status ? err.message : (status === 403 ? err.message : 'Internal server error');
  const code = err.code || (status === 403 && err.message === 'Not allowed by CORS' ? 'CORS_NOT_ALLOWED' : `HTTP_${status}`);
  fail(res, { status, message, code });
}

module.exports = errorMiddleware;
