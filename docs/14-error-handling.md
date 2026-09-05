# 14 — Error Handling

Teacher's summary: every response this API sends — success or failure — has the same JSON shape, and every error, no matter where it happens, funnels through exactly one piece of code before it reaches the client. That's what makes this system predictable to build a frontend against.

## The response envelope — `utils/respond.js`

```js
function ok(res, data = null, { message = 'Request successful', meta, status = 200 } = {}) { ... }
function created(res, data, message = 'Resource created') { ... }
function noContent(res) { ... }
function fail(res, { status = 500, message = 'Something went wrong', code = 'INTERNAL_ERROR', details = null } = {}) { ... }
```

- Success: `{ success: true, message, data }` (optionally `meta`).
- Failure: `{ success: false, message, error: { code, details } }`.

The comment at the top of `utils/respond.js` explains why this exists: before it, roughly 15 controllers had each picked their own response shape — bare arrays, `{id, deleted:true}`, `{error: '...'}`, `null` vs `[]` for "nothing here." This module makes the wire format one format. The frontend's `main/frontend/src/utils/api.js` response interceptor unwraps `{success:true, data}` back down to plain `data` and folds `{success:false, message}` into the `.error` string shape older frontend code already expected — so this change didn't require rewriting every context/component that reads `response.data`.

## `express-async-errors` — why controllers rarely need try/catch

`server.js` requires this **before any route is registered**:

```js
require('express-async-errors');
```

Its comment: this patches Express 4's router so a rejected promise thrown inside any `async` route handler is forwarded to the error-handling middleware automatically, instead of leaving the request hanging with no response at all. Practically, this means a controller like `getMe` in `controllers/authController.js` can just `await db.collection('users').doc(...).get()` with no wrapping `try/catch` — if that promise rejects, `express-async-errors` catches it and routes it to `middleware/errorMiddleware.js` for you.

## `middleware/errorMiddleware.js` — the single funnel

```js
function errorMiddleware(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = err.status || (err.message === 'Not allowed by CORS' ? 403 : 500);
  const message = err.status ? err.message : (status === 403 ? err.message : 'Internal server error');
  const code = err.code || (status === 403 && err.message === 'Not allowed by CORS' ? 'CORS_NOT_ALLOWED' : `HTTP_${status}`);
  fail(res, { status, message, code });
}
```

Registered last in `server.js`, after every route and after the 404 catch-all — Express recognizes it as an error handler specifically because it takes **four** arguments (`err, req, res, next`).

Two categories of error reach it:

1. **Intentional, safe-to-show errors.** Controllers throw `Object.assign(new Error('...'), { status: 4xx, code: '...' })` — a plain `Error` object with extra properties bolted on. Examples: `controllers/complaintControllerFactory.js`'s `updateStatus` throws `Object.assign(new Error('Complaint not found'), { status: 404 })`; `controllers/approvalController.js`'s `decideApproval` throws similarly for 404/409/403 cases inside a transaction. Because `err.status` is set, `errorMiddleware` trusts `err.message` and sends it straight to the client — the developer who wrote the throw *meant* for the user to read that message.
2. **Unexpected errors.** Anything else — a MongoDB driver error, a `TypeError` from a bug, a third-party library throwing — has no `err.status`, so `status` falls back to `500` and the client only ever sees the generic string `'Internal server error'`. The *real* message and stack are still visible server-side via `console.error(err)` on the line above, which is where you'd actually debug it — the client is deliberately not told internal details that could leak implementation info.

The CORS special-case: `server.js`'s `cors()` middleware calls back with `new Error('Not allowed by CORS')` for a disallowed origin — that error has no `.status`, so without the explicit check it would report as a generic 500. The `errorMiddleware` code special-cases that exact message to a `403` with code `CORS_NOT_ALLOWED`, since a rejected-origin is a client mistake (403), not a server fault (500).

`if (res.headersSent) return next(err)` guards against calling `res.status().json()` a second time on a request that already started streaming a response (e.g. a CSV/file download route that failed partway through) — Express would throw `ERR_HTTP_HEADERS_SENT` otherwise.

## The 404 catch-all — `server.js`

```js
app.use((req, res) => fail(res, { status: 404, message: 'Not found', code: 'NOT_FOUND' }));
```

Placed after every real route but before `errorMiddleware`. Without it, an unmatched URL fell through to Express's own default 404 handler, which sends an HTML error page — breaking the "every response is the same JSON envelope" guarantee this API otherwise holds everywhere.

## `/healthz` — its own explicit try/catch

```js
app.get('/healthz', async (req, res) => {
  const start = Date.now();
  try {
    await db.ping();
    ok(res, { mongo: 'reachable', pingMs: Date.now() - start });
  } catch (err) {
    console.error('healthz check failed:', err);
    fail(res, { status: 503, message: 'Database unreachable', code: 'SERVICE_UNAVAILABLE' });
  }
});
```

This is the one route that wraps itself explicitly rather than relying on `express-async-errors` + the generic error middleware, because the comment explains it needs a specific status (`503 Service Unavailable`, not a generic `500`) and a deliberately generic client-facing message — this endpoint is **unauthenticated** (hit by uptime monitors before anyone has logged in), so `err.message` from the MongoDB driver is logged server-side but never echoed back to an anonymous caller.

## Every distinct error `code` in the codebase

| Code | Meaning | Where it's thrown |
|---|---|---|
| `VALIDATION_ERROR` | Missing/invalid request fields | Everywhere — the most common code in the app |
| `UNAUTHORIZED` | No token / not logged in | `authMiddleware.js`, `permissionMiddleware.js` |
| `INVALID_TOKEN` | JWT invalid or expired | `authMiddleware.js` |
| `ACCOUNT_NOT_FOUND` | Profile doc missing for a valid token/session | `authMiddleware.js`, `authController.js` (`refresh`) |
| `ACCOUNT_DEACTIVATED` | `active: false` on the user profile | `authMiddleware.js`, `authController.js` (`login`) |
| `SESSION_REVOKED` | The session behind this token was force-logged-out | `authMiddleware.js` |
| `FORBIDDEN` | Role/ownership/permission check failed | Widely used (`roleMiddleware.js`, `permissionMiddleware.js`, many controllers) |
| `NOT_FOUND` | Requested document doesn't exist | Widely used |
| `CONFLICT` | State conflict (e.g. double check-in, already-decided approval) | `hrDeskController.js`, `approvalController.js` |
| `CSRF_INVALID` | Double-submit cookie/header mismatch | `csrfMiddleware.js` |
| `RATE_LIMITED` | Too many requests in the window | `server.js`, `authRoutes.js`, `founderRoutes.js` (rate limiters) |
| `ACCOUNT_LOCKED` | 5+ failed logins, awaiting Super Admin unlock | `authController.js` (`login`) |
| `INVALID_CREDENTIALS` | Wrong email/password | `authController.js` (`login`) |
| `SESSION_EXPIRED` | Refresh token invalid/expired/reused | `authController.js` (`refresh`) |
| `REGISTRATION_FAILED` | `auth.createUser` rejected (e.g. duplicate email) | `authController.js` (`register`) |
| `USER_CREATE_FAILED` | Same, for Super-Admin-created accounts | `superAdminUserController.js` |
| `ASSET_ALREADY_EXISTS` | Duplicate asset id | `assetController.js` |
| `DEPARTMENT_IN_USE` | Can't delete a department still referenced by users | `departmentController.js` |
| `EMAIL_SEND_FAILED` | SMTP send failed | `hrDeskController.js` (`sendEmail`) |
| `SERVICE_UNAVAILABLE` | Mongo unreachable | `server.js` (`/healthz`) |
| `CORS_NOT_ALLOWED` | Origin not on the allow-list | `errorMiddleware.js` (special-cased) |
| `HTTP_<status>` | Fallback code when no explicit `code` was set | `errorMiddleware.js` (default) |
| `INTERNAL_ERROR` | Default `fail()` code when none is passed | `utils/respond.js` default |
| `REQUEST_FAILED` | Generic fallback inside a transaction's `.catch()` when the thrown status isn't in that function's explicit code map | `complaintControllerFactory.js` (`updateStatus`) |

For the security-relevant subset of this list (why a 401 vs 403 was chosen, what each code intentionally does *not* reveal), see [15-security.md](15-security.md).
