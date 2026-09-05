# 26 — Glossary

Terms relevant to this project's actual stack (Node/Express/MongoDB) and domain (tickets/HR/IT/Sales portal), defined in plain language. Where a term has a concrete instance in this codebase, the file is named.

**JWT (JSON Web Token)** — A signed (not encrypted) string carrying a JSON payload, used here to say "this request comes from user X, in session Y" without a database lookup on every field. In this app: `utils/jwt.js`.

**Access token** — A short-lived JWT proving identity for the next few requests. In this app: 15 minutes (`ACCESS_TOKEN_TTL` in `utils/jwt.js`), stored in the `fute_token` cookie.

**Refresh token** — A long-lived, opaque (non-JWT) random value used only to obtain a new access token once the old one expires, without forcing the user to log in again. In this app: `utils/sessions.js`, stored in the `fute_refresh` cookie, only sent to `/api/auth`.

**httpOnly cookie** — A cookie flagged so browser JavaScript cannot read it via `document.cookie` — only the browser itself sends it automatically on requests. Protects a token from being stolen by an XSS bug. In this app: the `fute_token` and `fute_refresh` cookies (`utils/cookies.js`); the `fute_csrf` cookie is deliberately **not** httpOnly (see CSRF below).

**SameSite** — A cookie attribute controlling whether a cookie is sent on cross-site requests. `Lax` (local dev here) mostly restricts this; `None` (required for this app's cross-origin deployed setup) allows it, but must be paired with `Secure` (HTTPS-only). In this app: `utils/cookies.js`'s `baseCookieOptions()`.

**CORS (Cross-Origin Resource Sharing)** — The browser-enforced rule that JavaScript on one origin can't read responses from another origin unless that server explicitly allows it. In this app: `server.js`'s `cors({ origin(origin, cb) {...} })`, restricted to `FRONTEND_URL` and `localhost`.

**Preflight request** — An automatic `OPTIONS` request the browser sends before certain cross-origin requests, asking "are you okay with this?" before sending the real one. In this app: handled by the `cors` middleware; its result is cached for 600 seconds (`maxAge: 600` in `server.js`) so it isn't repeated before every polled request.

**CSRF (Cross-Site Request Forgery)** — An attack where a malicious page tricks a victim's browser into sending a request to another site using the victim's own cookies. See [25-teacher-explanation.md](./25-teacher-explanation.md) §4 for the full walkthrough.

**Double-submit cookie** — A CSRF defense: the server gives the client a random token in two channels (a cookie and, echoed back, a header); an attacker's page can trigger the cookie to be sent but can't read its value to also produce a matching header. In this app: `middleware/csrfMiddleware.js`.

**Rate limiting** — Capping how many requests a client can make in a time window, to blunt brute-force and abuse. In this app: `express-rate-limit`, three separate limiters (`server.js` global 300/15min, `routes/authRoutes.js` 10/15min on login/register/refresh, `routes/founderRoutes.js` 20/60s on expensive analytics endpoints).

**bcrypt** — A slow-by-design password hashing algorithm, resistant to brute-force because each guess is deliberately expensive to compute. In this app: `bcryptjs`, used in `config/db.js`'s `auth.createUser`/`verifyPassword`.

**Salt** — Random data mixed into a password before hashing, so two users with the same password get different hashes and precomputed "rainbow table" attacks don't work. bcrypt generates and stores the salt as part of its own hash output automatically — there is no separate salt field in this app's schema.

**Hashing vs. encryption** — Hashing is one-way (you can't recover the original password from a hash, only compare a guess against it); encryption is two-way (you can decrypt it back with the right key). Passwords are hashed here (bcrypt); nothing in this app is described as encrypted at rest.

**Session revocation** — Invalidating a login before its token would naturally expire (e.g. "force logout," or detecting a stolen/reused refresh token). In this app: `utils/sessions.js`'s `isSessionRevoked`/`consumeRefreshToken`, backed by the `sessions` collection.

**RBAC (Role-Based Access Control)** — Granting permissions based on a user's assigned role (e.g. `hr`, `it`, `founder`) rather than per-individual. In this app: `middleware/roleMiddleware.js`, layered with a finer per-action matrix (`middleware/permissionMiddleware.js`) — see [08-authorization.md](./08-authorization.md).

**Middleware** — A function that runs on a request before (or instead of) the final handler, able to inspect/modify the request, short-circuit it, or pass it along. See [09-middleware.md](./09-middleware.md).

**Express router** — Express's mechanism for grouping related routes (and their own middleware) into one file, then mounting that group under a URL prefix. In this app: every file in `routes/`, mounted in `server.js` (e.g. `app.use('/api/hr', require('./routes/hrRoutes'))`).

**ODM vs. driver** — An ODM (Object-Document Mapper, e.g. Mongoose) wraps a database with schema validation and model classes; a driver (e.g. the plain `mongodb` npm package) gives raw, low-level access with no schema enforcement. This app uses the raw `mongodb` driver, wrapped in a hand-written shim (see next entry) rather than a full ODM.

**Firestore-shaped shim (project-specific term)** — This project's own name (used throughout its comments) for `config/db.js`: a module that makes the native MongoDB driver expose the same method shapes (`collection().doc().get()/.set()`, `.where().orderBy().limit()`, `batch()`, `runTransaction()`) that the old Firebase Firestore Admin SDK had, so old controller code didn't need to be rewritten when the database changed. See [25-teacher-explanation.md](./25-teacher-explanation.md) §3.

**MongoDB collection / document** — A collection is roughly "a table"; a document is roughly "a row," but schemaless — different documents in the same collection can have different fields. In this app: e.g. the `users`, `it_complaints`, `sessions` collections.

**Transaction (multi-document)** — A group of reads/writes across one or more documents that either all succeed or all roll back together. In this app: `config/db.js`'s `runTransaction()`, used for e.g. updating a ticket's status and creating its linked approval record atomically (`complaintControllerFactory.js`'s `updateStatus`).

**Replica set** — A MongoDB deployment mode (even with just one member) required before the database will allow multi-document transactions; a bare standalone MongoDB instance refuses them. Per `docs/BACKEND_ARCHITECTURE_STATUS.md`, this app's production deployment needs this and, as of the last status check, it was not independently confirmed configured. See [20-deployment.md](./20-deployment.md).

**multer** — An Express middleware for parsing `multipart/form-data` (file upload) requests. In this app: `utils/upload.js`, configured with `memoryStorage()` (see next entry).

**memoryStorage** — A multer storage engine that keeps an uploaded file entirely in memory (as a `Buffer`) rather than writing it to disk automatically, so the controller can decide what to do with the bytes itself. In this app: used for both document uploads (`upload`) and spreadsheet imports (`uploadSpreadsheet`) in `utils/upload.js`; the controller then writes the buffer to disk manually (see `hrDeskController.js`'s `uploadEmployeeDocument`).

**MIME type** — A string identifying a file's format (e.g. `application/pdf`, `image/jpeg`). Used here as an upload allow-list, not just relying on the filename extension. In this app: `utils/upload.js`'s `ALLOWED_MIME_TYPES` / `SPREADSHEET_MIME_TYPES`.

**Path traversal** — An attack where a filename or path like `../../etc/passwd` is used to escape an intended directory and read/write files elsewhere on disk. In this app: guarded in `hrDeskController.js`'s download routes by checking the resolved absolute path still starts with `UPLOAD_ROOT` before serving it.

**XSS (Cross-Site Scripting)** — Injecting attacker-controlled script into a page other users view. In this app: guarded specifically in outgoing HTML emails via `utils/mailer.js`'s `escapeHtml()`, since ticket/lead fields are user-supplied and interpolated into email bodies.

**CSV/formula injection** — A value like `=cmd|'/c calc'!A1` in a CSV cell that Excel/Sheets executes as a live formula when the file is opened. In this app: neutralized in `controllers/analyticsController.js`'s `csvEscape()` and `controllers/salesDeskController.js`'s `escapeCsv()` by prefixing a leading apostrophe to any value starting with `=`, `+`, `-`, or `@`.

**Audit log** — A durable record of who did what administrative action, when. In this app: `utils/auditLog.js`'s `logAudit()`, written to the `audit_logs` collection on most Super Admin/founder write actions (create user, revoke session, update settings, etc.).

**SLA (Service Level Agreement, as used in this app)** — A per-priority, per-queue time budget for how fast a ticket should be resolved (e.g. IT "High" priority: 240 minutes to resolve). In this app: `controllers/slaController.js`'s `DEFAULT_SLA_POLICIES`, checked against real ticket age in `summarizeSlaForQueue()` and `dashboardController.js`'s `summarizeQueueForOverview()`.

**TTL cache (time-to-live cache)** — An in-memory cache that automatically treats entries as stale after a fixed duration, used here to cut down on repeated database reads for data that changes rarely. In this app: `authMiddleware.js`'s profile cache (60s), `permissionMiddleware.js`'s action-permission cache (30s), `sessions.js`'s revocation cache (30s), `dashboardController.js`'s overview cache (30s), `analyticsController.js`'s analytics cache (60s).

**Idempotency** — A property where repeating the same request produces the same end state as doing it once, with no extra side effects. **Partially guaranteed** in this app: `complaintControllerFactory.js`'s `updateStatus` explicitly checks `previousStatus !== 'Waiting Approval'` before creating a new approval record, specifically to avoid creating duplicates if the same status-change request is sent twice (e.g. a UI double-click). Not every write path in this app has an equivalent guard — this is called out here as a deliberate, localized fix, not a system-wide guarantee.

**Webhook** — An HTTP callback a third-party service calls into your app when something happens on their end. **Not used in this app** — no inbound webhook routes were found in the explored codebase; all integrations found (SMTP mail) are outbound calls this app initiates itself.

**NSSM (Non-Sucking Service Manager)** — A Windows utility for wrapping an arbitrary executable (like `node server.js`) as a proper Windows Service, so it starts on boot and survives a user logging out — unlike a process started manually in an interactive SSH session. Per `docs/BACKEND_ARCHITECTURE_STATUS.md`, this is the intended fix for this app's process-persistence problem. See [20-deployment.md](./20-deployment.md).

**PM2** — A Node.js process manager that can restart a crashed process and run multiple instances. Used in this project's earlier deployment attempt, but per `docs/DEPLOYMENT_PIPELINE_STATUS.md`, a PM2 daemon started under an interactive Windows SSH session was killed when that SSH session closed — motivating the move to NSSM.

**maildev** — A self-hosted fake SMTP server plus web UI, used in development/self-hosted deployment to capture outgoing emails without actually delivering them anywhere. In this app: the default `SMTP_HOST`/`SMTP_PORT` target in `.env.example`, consumed by `utils/mailer.js`.
