# 27 — Troubleshooting

Real, code-grounded problems a developer or operator of the Fute Portal backend (`main/backend`) is likely to hit, with the actual cause traced to source and the fix that follows from it.

---

### 1. Intermittent "CSRF token missing or invalid" (403 `CSRF_INVALID`) for a logged-in user

**Symptom:** A mutating request (POST/PATCH/DELETE) from a user who is clearly still logged in occasionally fails with `403` and `error.code === 'CSRF_INVALID'`, then succeeds on retry.

**Cause:** `middleware/csrfMiddleware.js` requires the `X-CSRF-Token` header (or `_csrf` body field) to exactly match the `fute_csrf` cookie. The frontend (`main/frontend/src/utils/api.js`) used to read `document.cookie` fresh on every request to build that header. That raced against a concurrent silent token refresh: `POST /api/auth/refresh` (triggered automatically by the response interceptor on any `401`) issues a **new** CSRF cookie value via `utils/cookies.js`'s `setCsrfCookie`. If a second request's header was built from the *old* cookie value a moment before the browser's cookie jar picked up the *new* one from the refresh response, the header and the cookie the browser actually attached no longer matched.

**Fix already in place:** `api.js` now caches the CSRF token in an in-memory JS variable (`csrfToken`), set explicitly by the response interceptor whenever a login/register/refresh response includes a `csrfToken` field in its body (`authController.js`'s `issueSessionCookies` always returns this value in the JSON response, not just as a cookie — see `07-authentication.md`). The request interceptor prefers this cached value over a fresh `document.cookie` read, removing the race entirely. On a genuine `403 CSRF_INVALID`, the interceptor also has a one-shot recovery path: re-read `document.cookie` once, and if it differs from the cached value, retry with the fresh value before giving up and redirecting to `/login`.

**If it recurs:** Check that every code path that rotates the CSRF cookie (`login`, `register`, `refresh` in `authController.js`) also returns `csrfToken` in its JSON body, and that the frontend's response interceptor is calling `setCsrfToken()` from that field. A new endpoint that silently issues a fresh CSRF cookie without also handing back the value in the response body would reintroduce the same race.

---

### 2. MongoDB connection issues (server hangs, `/healthz` returns 503)

**Symptom:** The server process starts, but requests hang, or `GET /healthz` returns `503 SERVICE_UNAVAILABLE` with `"Database unreachable"`.

**Cause:** `config/db.js` connects with `MONGODB_URL` (defaults to `mongodb://127.0.0.1:27017` if unset) and `MONGODB_DB_NAME` (defaults to `fute_portal` if unset). Every collection access in the app awaits a module-level `ready` promise that resolves once `client.connect()` succeeds — if Mongo is unreachable, that promise never resolves, and any request touching the database will hang rather than fail fast. `server.js`'s `/healthz` endpoint (`await db.ping()`) is the one endpoint designed to surface this cleanly, returning `503` with the real error logged server-side (`console.error('healthz check failed:', err)`).

**Fix:** Confirm `MONGODB_URL` points at a reachable MongoDB instance and that `MONGODB_DB_NAME` matches the intended database. In the current self-hosted deployment this is `mongodb://192.168.1.23:27017` (see `docs/BACKEND_ARCHITECTURE_STATUS.md`) — verify the Mongo service is actually running there and port `27017` is open (see item 7 below for the flaky-connection history already observed on this host, per `docs/DEPLOYMENT_PIPELINE_STATUS.pdf`).

---

### 3. Server refuses to start: `FATAL: JWT_SECRET is not set. Refusing to start.`

**Symptom:** `node server.js` (or the `nodemon`-driven `npm run dev`) exits immediately with this message and exit code 1.

**Cause:** This is an intentional, explicit fail-fast check at the very top of `server.js`:
```js
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}
```
The surrounding comment explains why this exists: without it, a missing `JWT_SECRET` used to let the server start successfully, and the failure "only surfaced on the first login attempt (`jwt.sign` throwing inside the request handler) — a config mistake turning into a production incident instead of a failed deploy/CI smoke check."

**Fix:** Set `JWT_SECRET` in the environment (`.env` locally, or the deployment's environment configuration) before starting the server. This is not a bug — it is the desired behavior.

---

### 4. `Error: Not allowed by CORS` (403 `CORS_NOT_ALLOWED`)

**Symptom:** A browser request from the frontend fails with a CORS-flavored `403` and `error.code === 'CORS_NOT_ALLOWED'` (mapped by `middleware/errorMiddleware.js` from the thrown `Error('Not allowed by CORS')`).

**Cause:** `server.js`'s CORS `origin()` callback only allows: `process.env.FRONTEND_URL`, the hardcoded `https://project-ticket-plum.vercel.app`, or an origin matching `/^http:\/\/localhost:\d+$/`. Anything else — including `http://127.0.0.1:<port>` (not `localhost`), a different deployed frontend domain, or a `FRONTEND_URL` that's unset/mismatched for a new environment — is rejected.

**Fix:** Set `FRONTEND_URL` to the exact origin (scheme + host, no path) the frontend is actually served from in that environment. For local dev, make sure the frontend is accessed via `http://localhost:<port>`, not `127.0.0.1`.

---

### 5. Login fails with `423 ACCOUNT_LOCKED`

**Symptom:** A user with (they believe) the correct password gets `423` and `"Account locked after too many failed login attempts — ask a Super Admin to unlock it"`, regardless of what password they enter.

**Cause:** `authController.js`'s `login` checks `preUser.locked` **before** verifying the password at all — once `failedLoginAttempts >= LOCK_THRESHOLD` (5), the account stays locked until explicitly cleared, even if the very next attempt would have been correct.

**Fix:** A Super Admin uses the Security Center (`PATCH /api/founder/security/users/:uid/unlock`, `controllers/securityController.js`'s `unlockAccount`) to reset both `locked` and `failedLoginAttempts` to their unlocked state. There is no self-service unlock path by design.

---

### 6. Users unexpectedly logged out / stuck in a refresh loop

**Symptom:** A user is signed out without clicking "logout," and subsequent login attempts seem to work but the session drops again shortly after.

**Cause:** `utils/sessions.js`'s `consumeRefreshToken` implements **refresh-token reuse detection**: if a refresh call presents a hash that matches a session's *previous* (already-rotated-out) `refreshTokenHash`, the entire session is revoked immediately with `revokedReason: 'refresh_token_reuse'`. This is a deliberate security response — the assumption is that the legitimate client already moved past that token via an earlier rotation, so a second presentation of the same old token means it was copied/stolen. In practice this can also be triggered by **two browser tabs racing** to refresh at the same moment, or a network layer retrying a `POST /api/auth/refresh` request that already succeeded server-side. The frontend's `api.js` already mitigates the common case by sharing one in-flight refresh promise across concurrent 401s (`refreshOnce()`), but any external retry logic (a proxy, a misbehaving client) that replays a `/refresh` call after it already completed can still trigger this.

**How to tell a deliberate security response from an actual bug:** A single, isolated user hitting this occasionally (e.g. after leaving multiple tabs open across a long idle period, or a flaky network causing a client-side retry) is expected behavior working as designed. If it happens **broadly, for many users at once**, suspect an infrastructure issue causing duplicate requests (e.g. a load balancer or proxy retrying timed-out requests that actually succeeded) rather than a session-security bug in this code.

**Fix (if it's the broad case):** Investigate the network/proxy layer for request duplication rather than the token-rotation logic itself, which is intentionally strict.

---

### 7. Ticket status update or approval decision fails with `500` on a standalone MongoDB

**Symptom:** `PATCH .../complaints/:id/status` (transitioning to `"Waiting Approval"`) or `PATCH /api/approvals/:id/decide` fails with a `500 Internal server error`.

**Cause:** Both operations run inside `db.runTransaction(...)` (`config/db.js`, backed by `client.startSession().withTransaction(...)`), because they must update a ticket/approval/extra-hours doc atomically (`complaintControllerFactory.js`'s `updateStatus`, `approvalController.js`'s `decideApproval`). **MongoDB transactions require a replica set** — a standalone `mongod` instance refuses multi-document transactions outright. This is a documented, known state of the current deployment: `docs/BACKEND_ARCHITECTURE_STATUS.md` lists "❌ Multi-doc transactions" explicitly and states *"MongoDB refuses this on a standalone instance — it needs to run as a (single-node) replica set... Fails cleanly with a 500, no partial writes."*

**Fix:** Initialize MongoDB as a (even single-node) replica set — `rs.initiate()` in the `mongo`/`mongosh` shell against the target instance — then restart the backend. Per `docs/DEPLOYMENT_PIPELINE_STATUS.pdf`, as of the last documented check this step (`rs.initiate()`) was still pending/unverified on the production host (`192.168.1.23`), tracked as stage **F** in that document's pipeline diagram.

---

### 8. File upload rejected with a `400` error

**Symptom:** An upload to a document/employee-document/document-template/spreadsheet-import endpoint fails immediately with `400 VALIDATION_ERROR`.

**Cause:** `utils/upload.js` enforces a strict allow-list via Multer's `fileFilter`:
- Employee documents / templates (`upload`): only `application/pdf`, `image/jpeg`, `image/jpg`, `application/msword`, and the `.docx` MIME type — anything else returns `"Only PDF, JPG, and Word (.doc/.docx) files are allowed"`.
- Sales lead import (`uploadSpreadsheet`): only `.xlsx` MIME types — anything else returns `"Only Excel (.xlsx) files are allowed"`.

Size limits are enforced separately: **10MB** for documents, **15MB** for spreadsheets — Multer rejects an oversized file before the `fileFilter` callback even matters, with its own error.

**Fix:** Confirm the file being uploaded is actually one of the allowed types (checked by MIME type, not just file extension) and under the relevant size cap. A `.xlsx` saved with an unusual MIME type by some tools (`application/vnd.ms-excel` is also accepted for older Excel exports) is the one deliberately permitted exception, per the comment: *"some browsers send this for .xlsx too."*

---

### 9. Document download returns `400 "Invalid document path"`

**Symptom:** `GET .../documents/:docType/download` or `GET /api/hr-desk/document-templates/:id/download` returns `400` with this message instead of the file.

**Cause:** This is the path-containment check in `controllers/hrDeskController.js` (`downloadEmployeeDocument`, `downloadDocumentTemplate`) — see `15-security.md` §8. It compares the resolved absolute path against `UPLOAD_ROOT` and refuses to serve anything outside it.

**What it means if it actually triggers:** Under normal operation this should **never** fire, because the `storagePath` value it checks is always generated server-side and stored in the database — never taken as a raw path from the client. If this error appears in practice, it indicates either (a) a corrupted/hand-edited `storagePath` value in the database for that record, or (b) a bug in a future code change that let an untrusted value flow into a stored path. Either way, treat it as a signal to inspect the affected document's stored `storagePaths.{docType}` (or `storagePath` for templates) field directly in the database rather than assuming it's a transient error.

---

### 10. Backend process stops running after the deploying SSH session closes ("silent crash")

**Symptom:** The backend was confirmed running (e.g. via `curl` to port 5000) shortly after a deploy, but is unreachable again later, with no crash log or alert.

**Cause:** This is a documented, previously-observed infrastructure issue, not an application bug: `docs/BACKEND_ARCHITECTURE_STATUS.md` lists "⚠️ Process persistence" and explains *"Windows OpenSSH kills PM2's daemon when the SSH session closes, since `webteam` has no interactive login."* `docs/DEPLOYMENT_PIPELINE_STATUS.pdf` independently confirms this exact history: *"This exact service previously ran 'for a few hours, then stopped' with no alert. Being up right now is not proof it's been fixed to auto-restart."*

**Fix:** Per both documents, the recommended fix is to run the Node process as a genuine **Windows Service** (e.g. via **NSSM**, which the deployment status doc references) rather than as a bare `pm2 start`/`node server.js` process kept alive only by an interactive SSH session. A Windows Service survives the operator's SSH session closing and can be configured to auto-restart on crash and on server reboot. As of the last documented check, this was still marked as pending confirmation ("🟡 Unverified, previously failed silently" — see `20-deployment.md` for full deployment status detail).

---

## Quick-reference table

| # | Symptom | Root cause file | Fix category |
|---|---|---|---|
| 1 | Intermittent CSRF failure | `middleware/csrfMiddleware.js`, `main/frontend/src/utils/api.js` | Already fixed in code — verify csrfToken propagation on any new auth endpoint |
| 2 | Mongo unreachable | `config/db.js` | Env var (`MONGODB_URL`) / infra |
| 3 | Startup crash, missing secret | `server.js` | Env var (`JWT_SECRET`) — intentional |
| 4 | CORS rejected | `server.js` | Env var (`FRONTEND_URL`) / dev origin |
| 5 | Account locked | `controllers/authController.js`, `controllers/securityController.js` | Super Admin action |
| 6 | Unexpected logout | `utils/sessions.js` | Investigate proxy/client duplication if widespread |
| 7 | 500 on ticket/approval transition | `config/db.js`, MongoDB deployment | Infra — enable replica set |
| 8 | Upload rejected | `utils/upload.js` | Client — check file type/size |
| 9 | "Invalid document path" | `controllers/hrDeskController.js` | Investigate stored data if it ever fires |
| 10 | Silent backend crash | Deployment/process manager | Infra — run as Windows Service (NSSM) |

Anything not covered above and not traceable to a specific file in this codebase: **Not determinable from the current codebase.**
