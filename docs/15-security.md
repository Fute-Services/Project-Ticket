# 15 — Security

This document explains, section by section, every security control that actually exists in the Fute Portal backend today (`main/backend`), grounded in the real source files. It ends with a clearly separated **Currently Implemented / Potential Weaknesses / Recommended Improvements** assessment. No code was modified to produce this document.

---

## 1. Authentication

- **Password hashing** — `config/db.js`'s `auth` object hashes passwords with `bcryptjs` at cost factor 10 (`bcrypt.hash(password, 10)` in `auth.createUser`) and verifies with `bcrypt.compare` in `auth.verifyPassword`. Passwords are stored only as hashes, in a dedicated `_auth_credentials` collection, separate from the `users` profile collection (see `06-database.md`).
- **JWT access tokens** — `utils/jwt.js` signs a short-lived (`ACCESS_TOKEN_TTL = '15m'`) JWT with `jsonwebtoken`, keyed by `process.env.JWT_SECRET`. The comment in the file states the reasoning directly: *"Short on purpose — this is the token that would matter if it ever leaked... The refresh token is what actually keeps someone signed in; this just limits how long a stolen access token stays useful."*
- **httpOnly cookies** — `utils/cookies.js` sets the access token (`fute_token`), refresh token (`fute_refresh`), and CSRF token (`fute_csrf`) as cookies. The access and refresh cookies are `httpOnly: true` (unreadable from page JavaScript, including a future XSS bug); the CSRF cookie is deliberately **not** `httpOnly` (explained in section 2). Cookies are `secure` and `sameSite: 'none'` only when `process.env.VERCEL` is set (deployed), and `sameSite: 'lax'`/non-secure for local `http://localhost` dev.
- **Account lockout** — `controllers/authController.js` defines `LOCK_THRESHOLD = 5`. Each failed password check increments `failedLoginAttempts` on the user's profile doc and records a row in the `failed_logins` collection; on reaching the threshold the account is flagged `locked: true` and `lockedAt`. A locked account's login attempt returns `423 ACCOUNT_LOCKED` regardless of password correctness, before the password is even checked. Only a Super Admin can clear this, via `controllers/securityController.js`'s `unlockAccount` (`PATCH /api/founder/security/users/:uid/unlock`), which resets both `locked` and `failedLoginAttempts`.
- **Password policy** — Both self-registration (`authController.js`'s `register`) and Super-Admin-driven creation/reset (`superAdminUserController.js`'s `createUser`, `resetUserPassword`) enforce a **minimum length of 10 characters**. There is no complexity requirement (no enforced mix of upper/lower/digit/symbol) — length is the only rule in code.

## 2. CSRF Protection

`middleware/csrfMiddleware.js` implements the **double-submit cookie** pattern:

- Any request whose method is not in `SAFE_METHODS` (`GET`, `HEAD`, `OPTIONS`) and whose path is not in `EXEMPT_PATHS` must present a value in the `X-CSRF-Token` header (or a `_csrf` field in a JSON body, as a fallback) that exactly matches the `fute_csrf` cookie value. A mismatch or missing value returns `403 CSRF_INVALID`.
- **Why this exists at all**, quoting the file's own comment: session auth moved from a JS-attached `Authorization` header (immune to CSRF) to a cookie. Because frontend and backend are separate origins, that cookie must be `SameSite=None` to be sent at all — which also means it's sent on cross-site requests, "exactly what SameSite normally exists to prevent." The double-submit check closes that gap: a forged cross-site request can't read the non-httpOnly, same-origin-only-readable `fute_csrf` cookie, so it can't produce a matching header value.
- **Exempt paths**: `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`. Login/register happen before any session exists — there's nothing to compare against, and per the comment, "a forged cross-site login can't read the response anyway (CORS), and there's no existing session for it to hijack." `/api/auth/refresh` is exempt because its own credential is the refresh cookie itself — "sent automatically and unreadable/unforgeable cross-site" — so a forged call can only rotate the victim's own session, which an attacker can't leverage.
- The header is the primary channel; a `_csrf` field in the JSON body is accepted as a fallback because "a handful of browser extensions strip non-standard request headers on cross-site calls," which was surfacing as an intermittent false CSRF failure for real logged-in users (see `27-troubleshooting.md` item 1).

## 3. Rate Limiting (`express-rate-limit`)

| Limiter | Window | Limit | Applied to | Defined in |
|---|---|---|---|---|
| Global baseline | 15 min | 300 requests | Every route (mounted before the router chain) | `server.js` |
| `authLimiter` | 15 min | 10 requests | `POST /api/auth/register`, `/login`, `/refresh`, `/verify-password` | `routes/authRoutes.js` |
| `expensiveReadLimiter` | 60 sec | 20 requests | `GET /api/founder/analytics`, `/analytics/export`, `/dashboard-overview`, `/sla-compliance` | `routes/founderRoutes.js` |

`server.js` explicitly sets `app.set('trust proxy', 1)` because Vercel terminates TLS and proxies every request through one internal hop; without it, `express-rate-limit`'s per-IP bucketing would key every visitor to the same address. The auth limiter's own comment notes it exists specifically to add a **per-IP** throttle on top of the **per-account** lockout above, "so an attacker can't spread guesses across many accounts... from a single source."

## 4. Input Validation & Sanitization

- **Required-field checks** — Nearly every controller validates required body fields up front and returns `400 VALIDATION_ERROR` with a descriptive message (e.g. `hrController`/`itController` via `complaintControllerFactory.js`'s `createComplaint`, `leaveController.applyLeave`, `assetController.createAsset`, etc.). This is a consistent pattern, not centralized — each controller does its own check.
- **HTML injection in emails** — `utils/mailer.js`'s `escapeHtml()` escapes `& < > " '` before interpolating user-supplied values (submitter name, department, status, etc.) into HTML email bodies (`newComplaintEmail`, `statusUpdateEmail`), and the same function is reused by `approvalController.js` and `hrDeskController.js` for their notification emails.
- **CSV/formula injection** — Two independent CSV export paths neutralize formula injection: `analyticsController.js`'s `csvEscape()` and `salesDeskController.js`'s `exportEmailCampaign`'s local `escapeCsv()`. Both prefix a value starting with `= + - @` with a leading apostrophe before quote-escaping, matching the comment: *"A value starting with =, +, -, or @ is interpreted as a live formula by Excel/Sheets the moment the export is opened."*
- **File type/size validation** — `utils/upload.js` restricts uploads via Multer's `fileFilter` to an explicit MIME allow-list (PDF/JPG/DOC/DOCX for documents, XLSX for spreadsheets) and caps size (10MB / 15MB respectively), rejecting anything else with a `400` error before the file is ever accepted.
- **Identifier validation** — `assetController.createAsset` validates a caller-supplied asset id against `/^[\w-]+$/` before using it as a Mongo document id, preventing unexpected characters from reaching the database layer.
- **Ownership/self-scoping as a validation boundary** — many endpoints resolve the acting identity from `req.user` (populated by `authMiddleware` from the verified JWT) rather than trusting a client-supplied id — e.g. HR-desk self-service endpoints (`myTodayAttendance`, `checkIn`, `checkOut`, `submitExtraHours`, `myLeaveSummary`) always key off `req.user.employeeId`, never a body/query parameter.

## 5. HTTP Security Headers

`server.js` applies `app.use(helmet())` with its **default configuration only** — no custom Content-Security-Policy, HSTS `maxAge` override, or other directive tuning is present in the code. Helmet's defaults set a baseline set of protective headers (`X-Content-Type-Options`, a default CSP, `X-Frame-Options`-equivalent via `frameguard`, etc.), but nothing in this codebase customizes them for the app's actual origins/scripts.

## 6. CORS

`server.js` configures `cors()` with:
- An explicit **allowlist**: `process.env.FRONTEND_URL` plus a hardcoded fallback `https://project-ticket-plum.vercel.app`, plus any `http://localhost:<port>` origin (regex `isLocalhost`) for local development regardless of environment.
- `credentials: true` — required so the browser will send/receive the httpOnly session cookie cross-origin (frontend and backend are separate domains). The code comment notes this is safe specifically because `origin` is never a wildcard — "the CORS spec forbids combining `credentials:true` with `Access-Control-Allow-Origin: *`."
- `maxAge: 600` — caches the browser's CORS preflight response for 10 minutes, reducing round trips for polling endpoints.
- A request with no `Origin` header (curl, server-to-server, same-origin) is allowed through; anything else not on the allowlist is rejected with `Error('Not allowed by CORS')`, which `middleware/errorMiddleware.js` maps to a `403 CORS_NOT_ALLOWED` response.

## 7. File Upload Security

Covered in full in `16-file-storage.md`; security-relevant points:
- `multer.memoryStorage()` — files never touch disk until the controller explicitly writes them (`fs.writeFileSync`), so a rejected upload never leaves a stray file on the server.
- MIME allow-lists and size caps (section 4 above).
- Path traversal protection (below) — the actual write/read location on disk is fully server-derived, never taken as a raw path from the client.

## 8. Path Traversal Protection

This is the control the task description refers to as "the recent path-traversal fix." It appears in `controllers/hrDeskController.js` in three places:

1. **`uploadEmployeeDocument`** — writes via `saveTemplateFile`-style logic; the `storagePath` is built entirely from server-controlled values (`path.join('employee-documents', id, `${docType}-${Date.now()}-${safeName}`)`), where `safeName` is the original filename with `req.file.originalname.replace(/[^\w.\-]/g, '_')` applied.
2. **`saveTemplateFile`** (used by `createDocumentTemplate`/`updateDocumentTemplate`) — the caller-supplied `category` is sanitized (`replace(/[^\w.\- ]/g, '_')`) before being used as a path segment, and then this explicit check runs:
   ```js
   if (!absolutePath.startsWith(UPLOAD_ROOT)) {
     throw Object.assign(new Error('Invalid document category'), { status: 400 });
   }
   ```
   The code's own comment is explicit about the threat model: *"category is caller-supplied (req.body.category) — sanitized above, but this containment check (same as the download routes) is what actually rules out a path-escape regardless of how it got past sanitization."*
3. **`downloadEmployeeDocument`** and **`downloadDocumentTemplate`** — before serving a file, both re-derive `absolutePath` from a server-stored `storagePath` field (never a client-supplied path) and repeat the same containment check:
   ```js
   if (!absolutePath.startsWith(UPLOAD_ROOT)) {
     return fail(res, { status: 400, message: 'Invalid document path', code: 'VALIDATION_ERROR' });
   }
   ```
   The comment on this one is candid that it's defense-in-depth, not the primary defense: *"storagePath is always server-generated (never taken from client input), but a resolved-path check costs nothing and rules out any path-escape regression as this code evolves."*

Net effect: even if a future code change accidentally let an untrusted value flow into a stored path, these `startsWith(UPLOAD_ROOT)` checks are a second, independent barrier against escaping the uploads directory.

## 9. Session Security

Implemented in `utils/sessions.js`:
- **Refresh tokens are opaque random values** (`crypto.randomBytes(32)`), not JWTs — "there's nothing to decode, their only job is 'does this match what we stored.'"
- **Only a SHA-256 hash of the refresh token is persisted** (`hashToken`), "same principle as a password: if the sessions collection were ever read by someone who shouldn't, a hash alone can't be replayed as a cookie value."
- **Rotation on every use** — `consumeRefreshToken` issues a brand-new refresh token and hash on every successful `/api/auth/refresh` call, storing the old hash as `previousRefreshTokenHash`.
- **Reuse detection** — if a *previous* (already-rotated-out) hash is presented again, the entire session is revoked outright (`revoked: true, revokedReason: 'refresh_token_reuse'`) rather than silently issuing another token. The comment explains the reasoning: the legitimate client has already moved past that token via an earlier rotation, so a repeat presentation means "whoever just presented it again is working from a copied/stolen value."
- **Atomicity** — the whole check-and-rotate sequence runs inside `db.runTransaction`, so two concurrent refresh calls for the same session can't both "succeed" off the same stale read.
- **Immediate revocation** — `logout` (`authController.js`), `revokeSession` and `forceLogoutUser` (`securityController.js`) flip a session's `revoked` flag; `authMiddleware.js`'s `isSessionRevoked` check (backed by a 30-second cache) means a revoked session stops working within that window on every subsequent request, not just on next login.

## 10. Authorization Layering

Full detail in `08-authorization.md`. Summary: every protected route runs `authMiddleware` (verifies the JWT + re-checks the live profile/active flag/session-revocation), then typically `roleMiddleware(...allowedRoles)` (coarse role gate), and on a few IT-asset routes additionally `requirePermission(resource, action)` (`middleware/permissionMiddleware.js`) — a fine-grained, Super-Admin-configurable action matrix layered *after* the role check. Several controllers add a third, code-level layer: explicit ownership checks (e.g. `complaintControllerFactory.js`'s `updateFields`/`deleteComplaint`/`reopenComplaint` checking `doc.user_id === req.user.id`).

## 11. Audit Logging

`utils/auditLog.js`'s `logAudit()` writes to the `audit_logs` collection for admin-style mutations: user create/update/deactivate/delete/reset-password, department create/update/delete, permission/settings/SLA/notification-rule changes, session revocation and force-logout. It is fire-and-forget from the caller's perspective — "an audit-log write should never fail the action it's recording." See `18-logging-monitoring.md` for the full list of what is and isn't audited.

---

## Currently Implemented

- bcrypt password hashing (cost 10), credentials stored separately from profile data.
- Short-lived (15 min) JWT access tokens in httpOnly, environment-appropriate (`secure`/`sameSite`) cookies.
- Long-lived, rotating, hashed opaque refresh tokens with reuse detection that revokes the whole session.
- Account lockout after 5 consecutive failed logins, with a Super-Admin-only unlock path.
- Minimum 10-character password length on registration and admin-driven creation/reset.
- Double-submit-cookie CSRF protection on every mutating request, with a narrowly scoped, justified exemption list.
- Three tiers of rate limiting (global, auth-specific, expensive-read-specific).
- Consistent required-field validation returning structured `400 VALIDATION_ERROR` responses.
- HTML-escaping of user-supplied values interpolated into notification emails.
- CSV/formula-injection neutralization on both CSV export endpoints.
- MIME-type allow-listing and size limits on all file uploads; uploads held in memory until explicitly written.
- Explicit path-containment checks around every disk read/write derived from user-influenced input.
- helmet() security headers (default configuration).
- A closed CORS origin allowlist with credentialed requests, safely paired with a non-wildcard origin.
- Role-based + fine-grained action-permission + code-level ownership authorization, layered.
- Audit trail for administrative actions.

## Potential Weaknesses

- **No password complexity requirement beyond length.** *(Observed in code — `authController.js`, `superAdminUserController.js` check only `password.length < 10`.)*
- **helmet() uses defaults only** — no explicit Content-Security-Policy, HSTS tuning, or other directive customization for this app's actual origins. *(Observed in code.)*
- **In-memory per-process caches introduce a bounded staleness window.** `authMiddleware.js`'s profile cache and `utils/sessions.js`'s revocation cache are each ~30–60 seconds. A deactivated account or a just-revoked session can remain functionally valid for up to that window. *(Observed in code.)* If the backend is ever scaled to multiple server processes/instances, each process holds its own independent cache, so a revoke would need to propagate to every instance — currently there is no shared cache invalidation mechanism. *(Inferred risk — single-instance deployment today per `20-deployment.md`, so this isn't an active issue, but it would need addressing before horizontal scaling.)*
- **No automated test coverage for security-critical logic** (auth, CSRF, session rotation/reuse detection). See `21-testing.md` — the project has no test framework configured at all. *(Observed in code — no test files or test script in `package.json`.)*
- **Rate limiting is IP-keyed.** An attacker distributing requests across many source IPs is not slowed by either the global or the auth-specific limiter. *(Inferred risk.)*
- **Audit logging covers administrative actions only.** Ticket creation/status changes, approval decisions, leave decisions, chat messages, and sales-lead changes are not written to `audit_logs` — only user/department/permission/settings/SLA/notification-rule/session actions are. *(Observed in code — `logAudit` is called only from `superAdminUserController.js`, `departmentController.js`, `permissionController.js`, `systemSettingsController.js`, `slaController.js`, `notificationController.js`, `securityController.js`.)*
- **No backup/redundancy strategy for local disk file storage** is present in the code. Uploaded employee documents and templates live only on the single server's local disk (`main/backend/uploads/`). *(Observed in code — no backup logic exists; whether an external backup process exists operationally is Not determinable from the current codebase.)*
- **No explicit input length caps** on most free-text fields (e.g. complaint `description`, chat `text`, remarks) beyond what MongoDB itself would eventually reject — a large payload could still be accepted and stored. *(Inferred risk.)*

## Recommended Improvements

- Add a password complexity check (e.g. require at least one letter and one digit) alongside the existing length floor, without changing the floor itself.
- Configure helmet's `contentSecurityPolicy` option explicitly for this app's known script/style/connect sources, rather than relying on the default policy.
- If the backend is ever run as more than one process/instance, replace the in-memory `Map`-based caches (profile cache, session-revocation cache, action-permission cache, analytics/dashboard caches) with a shared store (e.g. Redis) so a revoke is visible everywhere immediately — not required for the current single-instance deployment (`20-deployment.md`).
- Add a focused test suite for `utils/jwt.js`, `utils/sessions.js`, and `middleware/csrfMiddleware.js` given how security-sensitive that logic is (see `21-testing.md` for the current baseline of zero tests).
- Consider layering a secondary rate-limit signal beyond IP (e.g. per-account, already partially covered by the lockout mechanism) if IP-rotation abuse is observed in practice.
- Extend `logAudit` calls to ticket status changes, approval decisions, and leave decisions if an operational audit trail (not just an admin-action trail) becomes a requirement.
- Document and/or automate a backup routine for `main/backend/uploads/` (e.g. scheduled copy to another disk/location) — this is an operational/infrastructure change, not a code change, and is outside the scope of this documentation task.
- Add explicit `maxLength` validation on free-text body fields where a runaway payload could bloat a document unnecessarily.

No code was changed while producing this document — all improvements above are recommendations only.
