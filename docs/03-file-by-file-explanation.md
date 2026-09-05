# File-by-File Explanation — Fute Portal Backend

This document walks through every non-trivial source file in `main/backend`, explaining what it does, why it exists, and how it connects to the rest of the system. It is derived entirely by reading the source in this repository — nothing here is guessed. Where something can't be determined from the code, that is stated explicitly.

Folders covered: `server.js` (entry point), `config/db.js` (data layer), `middleware/`, `utils/`, `routes/`, `controllers/`, and `package.json`.

---

## server.js

### server.js

**Purpose**: The Express application entry point. Wires up global middleware (security headers, rate limiting, CORS, body parsing, cookies, CSRF), mounts every route module under its `/api/...` prefix, defines the health-check and root endpoints, and starts the HTTP listener (except when running on Vercel, where the platform itself invokes the exported `app`).

**Imports**: `express`, `cors`, `helmet`, `express-rate-limit`, `cookie-parser`, `dotenv` (loads `.env`), `express-async-errors` (patches Express 4's router so a rejected promise in an `async` route handler reaches the error middleware instead of hanging the request — must be required before any routes), `./config/db` (for `db.ping()` in `/healthz`), `./utils/respond` (`ok`, `fail`), `./middleware/csrfMiddleware`, `./middleware/errorMiddleware`, and every file under `./routes/`.

**Functions/exports**: No named functions besides the inline route handlers for `GET /` and `GET /healthz`, and an internal `shutdown(signal)` closure used for graceful shutdown. Exports the configured `app` object (`module.exports = app`), which is what a serverless platform (Vercel) or a local `node server.js` process would use.

**Startup guard**: Before anything else, if `process.env.JWT_SECRET` is missing the process exits immediately (`process.exit(1)`) with a fatal log line — this converts a configuration mistake into an immediate deploy-time failure instead of a runtime crash the first time someone tries to log in.

**Middleware order** (this exact order matters):
1. `helmet()` — sets security headers (CSP, HSTS, etc. via Helmet defaults).
2. A global `express-rate-limit` instance: 300 requests / 15 minutes per IP, JSON error body on limit.
3. `cors(...)` — origin allow-list built from `FRONTEND_URL` env var plus the hardcoded production frontend URL plus any `http://localhost:<port>` origin (regex `^http:\/\/localhost:\d+$`); `credentials: true` so the httpOnly session cookie can be sent cross-origin; `maxAge: 600` caches the preflight response for 10 minutes.
4. `express.json()` — JSON body parsing.
5. `cookie-parser()` — populates `req.cookies`.
6. `csrfMiddleware` (global) — double-submit CSRF check on every mutating request except the exempt auth paths.

**Routes mounted** (see `04-api-documentation.md` for full detail):
`/api/auth`, `/api/hr`, `/api/it`, `/api/founder`, `/api/founder/security`, `/api/approvals`, `/api/leave`, `/api/coordinator`, `/api/production/renders`, `/api/hr-desk`, `/api/sales-desk`, `/api/chat`.

**Special endpoints**:
- `GET /` — unauthenticated liveness ping, returns `{ message: 'Fute Portal API running' }` via `ok()`.
- `GET /healthz` — unauthenticated, actually calls `db.ping()` (a real MongoDB `{ping:1}` command) so an orchestrator can distinguish "process up" from "process up but DB unreachable." Returns `{ mongo: 'reachable', pingMs }` on success, or a `503 SERVICE_UNAVAILABLE` via `fail()` on failure (the raw driver error is logged server-side only, never returned to the caller).
- 404 fallback — any unmatched route returns the same JSON envelope shape (`fail(res, {status:404, ...})`) instead of Express's default HTML 404 page.
- `errorMiddleware` — mounted last, catches anything thrown/rejected anywhere upstream.

**`trust proxy`**: `app.set('trust proxy', 1)` — required because the deployment sits behind one reverse-proxy hop (Vercel, or the on-prem setup's own reverse proxy); without it, `express-rate-limit`'s per-IP bucketing would see every request as coming from the proxy's own address.

**Graceful shutdown**: When not running on Vercel (`!process.env.VERCEL`), `server.listen()` is captured and `SIGTERM`/`SIGINT` handlers call `server.close()` (stop accepting new connections, let in-flight ones finish) with a 10-second hard-exit fallback via `setTimeout(...).unref()`.

**Callers**: None (entry point) — invoked by `npm start` / `npm run dev` (nodemon) per `package.json`, or by the hosting platform.

**Callees**: Every route module, `config/db.js` (via `db.ping()`), `utils/respond.js`, `middleware/csrfMiddleware.js`, `middleware/errorMiddleware.js`.

**Error handling**: Anything thrown synchronously or rejected inside an `async` handler anywhere in the app is funneled to `errorMiddleware` thanks to `express-async-errors`. The CORS `origin` callback's `Error('Not allowed by CORS')` is specifically recognized and mapped to a 403 inside `errorMiddleware`.

**Security notes**: This file is where most cross-cutting security controls are wired: Helmet headers, rate limiting, a strict CORS allow-list (not `cors()` with defaults), global CSRF enforcement, and the fail-fast `JWT_SECRET` check. The unauthenticated `/healthz` deliberately does not leak driver error detail to the client.

---

## config/db.js

### config/db.js

**Purpose**: A **Firestore-shaped shim over the native MongoDB driver**. The application was originally written against the Firebase Admin SDK's Firestore call shape (`collection().doc().get()/.set()/.update()`, `.where().orderBy().limit()` query chains, `.batch()`, `.runTransaction()`). Rather than rewrite roughly 170 call sites across every controller when the project migrated off Firebase, this module reproduces just enough of that API surface on top of MongoDB, so controller code is unchanged from the Firestore era except for the import path (`require('./config/firebase')` → `require('./config/db')`).

**Imports**: `mongodb` (`MongoClient`, `ObjectId`), Node's built-in `crypto`, `dotenv`.

**Connection**: `MONGODB_URL` (default `mongodb://127.0.0.1:27017`) and `MONGODB_DB_NAME` (default `fute_portal`) from env. A single `MongoClient` is created at module load; `const ready = client.connect().then(...)` is the shared connection promise every operation awaits internally via the `col(name)` helper. On first connect, a **unique index** on `_auth_credentials.email` is created — this is the real guard against two concurrent registrations both passing the `findOne`-then-insert email-uniqueness check in `auth.createUser` (a race condition the `findOne` alone cannot close).

**Key building blocks**:
- `generateId()` — produces 20-character random alphanumeric IDs (`ID_CHARS` = A-Za-z0-9), mimicking Firestore's own auto-ID format, using `crypto.randomBytes(20)` mapped through the character set. This keeps IDs visually/format-compatible with any legacy Firestore-era data.
- `FieldValue.arrayUnion(...values)` — a marker object (keyed by a private `Symbol`) that `set()`/`update()` detect and translate into MongoDB's `$addToSet` operator. This is the one Firestore write-transform actually used anywhere in the app (`salesDeskController.js`'s `logCall`).
- `FieldPath.documentId()` — a marker (private `Symbol`) representing Firestore's synthetic "document ID" field; mapped to Mongo's real `_id` wherever it's used in a `where()`/`orderBy()` clause. Used only by `utils/pagination.js` as a cursor tiebreaker field.
- `splitFieldValues(data)` — splits a plain write payload into `$set` fields and any `arrayUnion` markers destined for `$addToSet`, since one Mongo update document can carry both.
- `stripId(doc)` — removes Mongo's `_id` from a returned document so `.data()` matches Firestore's shape (id is available separately via `.id`).
- `makeDocRef(collectionName, id)` — returns an object with `.get()`, `.set(data, {merge})`, `.update(data)`, `.delete()`, mirroring `DocumentReference`. `.set()` without `merge` does a full `replaceOne` (Firestore's non-merge `set()` semantics — replaces the whole document); with `merge: true` it does an `upsert: true` `updateOne`. `.update()` throws a `NOT_FOUND`-coded error if no document matched (Firestore's own `update()` behavior on a missing doc).
- `buildQuery(state)` — translates accumulated `where()`/`orderBy()`/`startAfter()` state into a Mongo `{filter, sort}` pair. Supports operators `==`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `array-contains` (mapped onto `$eq`/`$ne`/`$lt`/`$lte`/`$gt`/`$gte`/`$in`/`$eq`). `startAfter` builds Firestore's own keyset-pagination semantics: given an `orderBy` chain of N fields, "after (v1..vN)" becomes an OR-of-ANDs expression — this is the real algorithm behind `utils/pagination.js`'s cursor.
- `makeQuery(collectionName, state)` — the chainable query builder (`where`, `orderBy`, `limit`, `startAfter`, `get()`, `count().get()`), each call returning a new immutable query object (functional-style chaining, matching Firestore's own API).
- `collection(name)` — returns a query object plus `.doc(id)` (get/create a doc reference; auto-generates an id via `generateId()` if none given) and `.add(data)` (insert with a fresh generated id).
- `batch()` — Firestore-style batched writes (`set`/`update`/`delete` queued, then `.commit()`). Implemented as a MongoDB session transaction (`session.withTransaction`) so the batch is atomic — this requires MongoDB to be running as a replica set (even a single-node one); see `20-deployment.md` for the current status of that requirement.
- `runTransaction(fn)` — Firestore-style transaction callback; `fn` receives a `tx` object with `get`/`set`/`update`/`delete`, all bound to one Mongo session/`withTransaction` block.
- `ping()` — issues a real MongoDB `{ping: 1}` admin command; used by `server.js`'s `/healthz`.
- **`auth` object** — replaces Firebase Auth's admin SDK surface (`createUser`, `getUserByEmail`, `updateUser`, `deleteUser`, plus an app-specific `verifyPassword`), backed by a dedicated `_auth_credentials` Mongo collection (kept **separate** from the `users` profile collection deliberately — several callers do a full, non-merge `.set()` on the `users` profile doc, which would otherwise silently wipe out a co-located password hash). Passwords are hashed with `bcryptjs` (`bcrypt.hash(password, 10)`); `verifyPassword` does `bcrypt.compare`. `createUser` throws an `auth/email-already-exists` coded error on either a pre-existing `findOne` match or a `11000` (duplicate-key) Mongo error from the unique index — the two-layer check described above.

**Exports**: `{ db: { collection, batch, runTransaction, ping }, auth, FieldValue, FieldPath, ObjectId }`.

**Callers**: Every controller and most middleware/utils files (`db.collection(...)`), `authController.js`/`superAdminUserController.js` (`auth.*`), `utils/pagination.js` and `utils/sessions.js` (`FieldPath`/transactions).

**Callees**: The `mongodb` npm driver directly; no other internal modules.

**Error handling**: Domain errors are thrown as `Object.assign(new Error(msg), { code })` (Firebase-Auth-style string codes like `auth/user-not-found`) or `{status}` (HTTP-style, used by `.update()`'s `NOT_FOUND`). Callers (controllers) catch and translate these into the app's own `fail()` envelope.

**Security notes**: This is the only file with direct database credentials access and the only place password hashing happens. The unique email index is a real security/integrity control, not just a convenience. Because `batch()`/`runTransaction()` depend on MongoDB session transactions, any deployment running MongoDB as a plain standalone instance (not a replica set) will have those operations fail — see `docs/BACKEND_ARCHITECTURE_STATUS.md`, which documents this as a known current gap ("❌ Multi-doc transactions").

---

## middleware/

### middleware/authMiddleware.js

**Purpose**: The core authentication gate. Verifies the caller's JWT (from either an httpOnly cookie or an `Authorization: Bearer` header), re-validates the user's live profile and account status, checks whether their session has been remotely revoked, and populates `req.user` for downstream handlers.

**Imports**: `config/db` (`db`), `utils/sessions` (`isSessionRevoked`), `utils/respond` (`fail`), `utils/cookies` (`AUTH_COOKIE`), `utils/jwt` (`verifyAccessToken`).

**Functions/exports**: Default export is the middleware function `authMiddleware(req, res, next)`. Also defines an internal `getProfile(uid)` helper.

**Token extraction**: `req.cookies[AUTH_COOKIE]` (i.e. `fute_token`) is preferred; falls back to `Authorization: Bearer <token>` for non-browser clients. Missing token → `401 UNAUTHORIZED`.

**Verification chain**:
1. `verifyAccessToken(token)` (JWT signature + expiry check) — failure (invalid or expired) → `401 INVALID_TOKEN`. The frontend's Axios interceptor is expected to catch this specific case and silently call `/api/auth/refresh`.
2. `getProfile(decoded.id)` — fetches the user's live Firestore-shim profile doc, **cached for 60 seconds per uid** (`CACHE_MS = 60_000`, `profileCache` is a plain in-process `Map`). This cache exists because checking the DB on every single request once exhausted the (former) Firestore read quota; the tradeoff is that a role change or account deletion can take up to 60 seconds to take effect instead of being instant.
3. Missing profile → `401 ACCOUNT_NOT_FOUND`. `active === false` → `403 ACCOUNT_DEACTIVATED`.
4. `isSessionRevoked(decoded.sid)` (from `utils/sessions.js`, itself cached 30s) → `401 SESSION_REVOKED` if the session was force-logged-out or reused a rotated-out refresh token.
5. On success, sets `req.user = { id, email, role, full_name, sid, employeeId }`.

**Callers**: Applied as route-level middleware (`auth`) in every route file except the unauthenticated `authRoutes.js` endpoints (`/register`, `/login`, `/refresh`).

**Callees**: `config/db.js`, `utils/sessions.js`, `utils/jwt.js`, `utils/cookies.js`, `utils/respond.js`.

**Error handling**: Every failure path returns via `fail()` with a specific `code` the frontend can branch on (`UNAUTHORIZED`, `INVALID_TOKEN`, `ACCOUNT_NOT_FOUND`, `ACCOUNT_DEACTIVATED`, `SESSION_REVOKED`). No unhandled exceptions expected in normal operation; `verifyAccessToken` throwing is caught explicitly.

**Security notes**: This is the single most security-critical file for authorization. The in-process cache is a deliberate, documented security/cost tradeoff (up to 60s staleness). The `sid`-based revocation check is what makes "force logout" (`securityController.js`) actually effective immediately rather than waiting for token expiry.

---

### middleware/csrfMiddleware.js

**Purpose**: Implements a double-submit-cookie CSRF defense, needed specifically because the session's access token now lives in a `SameSite=None` cross-origin cookie (frontend and backend are different domains) — a cookie the browser will *attach* to a forged cross-site request even though `SameSite` can't stop that (it must be `None` to be sent cross-origin at all).

**Imports**: `utils/cookies` (`CSRF_COOKIE`), `utils/respond` (`fail`).

**Functions/exports**: Default export `csrfMiddleware(req, res, next)`.

**Logic**:
- `SAFE_METHODS = {GET, HEAD, OPTIONS}` are always allowed through (no state change, nothing to forge).
- `EXEMPT_PATHS = {/api/auth/login, /api/auth/register, /api/auth/refresh}` are exempt: login/register happen before any session exists (nothing to hijack, and CORS blocks a forged cross-site page from reading the response anyway); `/refresh` is exempt because its only credential is the refresh cookie itself — unforgeable and invisible cross-site, so a forged call can't do anything an attacker could exploit.
- For every other mutating request: reads `req.cookies[CSRF_COOKIE]` (`fute_csrf`) and compares it against `req.headers['x-csrf-token']` **or** `req.body._csrf` (the body fallback exists because some browser extensions strip non-standard headers on cross-site requests — see `main/frontend/src/utils/api.js`, which sends both). Mismatch or either missing → `403 CSRF_INVALID`.

**Callers**: Mounted globally in `server.js` (`app.use(csrfMiddleware)`), after `cookieParser()` and before all routes.

**Callees**: `utils/cookies.js`, `utils/respond.js`.

**Security notes**: This is the app's core CSRF defense. The comments in the source explicitly document the double-submit property: a cross-site attacker's page cannot *read* the (non-httpOnly, same-origin-only-readable) CSRF cookie, so it can never produce a matching header/body value, even though the browser will still *send* the cookie itself along with the forged request. Full CSRF/refresh flow interplay is documented in `07-authentication.md`.

---

### middleware/permissionMiddleware.js

**Purpose**: A granular, per-action authorization gate layered *after* the coarser role check (`roleMiddleware`) — lets Super Admin restrict a specific role from a specific action on a specific resource (e.g. "IT can create/edit assets but not delete them") via the Action Permissions panel, without touching route-level role gates.

**Imports**: `config/db` (`db`), `utils/respond` (`fail`).

**Functions/exports**: `requirePermission(resource, action)` — a factory returning middleware; `ACTION_PERMISSIONS_DOC` (exported reference to the `settings/action_permissions` doc, reused by `permissionController.js`); `clearActionPermissionsCache()` (exported so `permissionController.updateActionPermissions` can invalidate the cache immediately on write).

**Logic**: `getActionPermissionsMatrix()` reads `settings/action_permissions`, cached 30 seconds (`CACHE_MS = 30_000`, module-level `cached` variable — same short-TTL-cache pattern as `authMiddleware`). `requirePermission(resource, action)` returns middleware that: allows `superadmin` unconditionally; otherwise looks up `matrix[req.user.role]?.[resource]` — if that key is **absent**, the action is **allowed by default** (matches the frontend's existing default-allow `canAccess` behavior, so shipping this doesn't retroactively lock anyone out until Super Admin explicitly restricts something); if present, the requested `action` must be in the array or a `403 FORBIDDEN` (`Missing permission: {resource}.{action}`) is returned.

**Callers**: Only `itRoutes.js`, on the four asset-mutation routes (`requirePermission('assets','create'|'edit'|'delete')`), layered after `role('it','founder')`.

**Callees**: `config/db.js`, `utils/respond.js`.

**Security notes**: Default-allow-when-unconfigured is a deliberate, documented tradeoff, not an oversight — it prioritizes not breaking existing access over fail-closed security for a feature (action-level permissions) that's opt-in per resource.

---

### middleware/roleMiddleware.js

**Purpose**: The primary coarse-grained authorization control — restricts a route to a fixed list of roles.

**Imports**: `utils/respond` (`fail`).

**Functions/exports**: Default export `roleMiddleware(...allowedRoles)` — a factory returning `(req, res, next) => ...`.

**Logic**: If `!req.user || !allowedRoles.includes(req.user.role)` → `403 FORBIDDEN` ("Access denied"); otherwise `next()`. Only 13 lines, but this is the check behind almost every `role('hr','founder')`-style call throughout `routes/`.

**Callers**: Nearly every route file (see `08-authorization.md` for the full role matrix).

**Callees**: `utils/respond.js` only.

**Security notes**: Must run **after** `authMiddleware` (it reads `req.user`, which only `authMiddleware` sets) — every route in the codebase observes this ordering (`auth, role(...)`).

---

### middleware/errorMiddleware.js

**Purpose**: The single Express error-handling middleware (4-argument signature), mounted last in `server.js`. Converts any thrown/rejected error, anywhere in the request lifecycle, into the app's standard JSON error envelope.

**Imports**: `utils/respond` (`fail`).

**Functions/exports**: Default export `errorMiddleware(err, req, res, next)`.

**Logic**: Logs the full error server-side (`console.error(err)`) always. If headers were already sent, delegates to Express's default handler (`next(err)`) rather than trying to send a second response. Determines `status`: `err.status` if the controller/utility explicitly set one (`Object.assign(new Error(...), {status})` pattern used throughout controllers), else `403` if the error is the CORS rejection (`err.message === 'Not allowed by CORS'`), else `500`. The **message sent to the client** is deliberately restricted: an explicit `err.status` error's message is trusted and shown (it was raised on purpose, e.g. "Complaint not found"); anything else becomes the generic `"Internal server error"` (except the CORS 403 case, whose message is safe to show) — this prevents leaking raw driver/internal error text to API clients. `code` defaults to `HTTP_{status}` unless the error carries its own `.code`, or the CORS case maps to `CORS_NOT_ALLOWED`.

**Callers**: Mounted once in `server.js`, after the 404 handler. Reached automatically for any `async` route handler's rejected promise, thanks to `express-async-errors` being required at the top of `server.js`.

**Callees**: `utils/respond.js`.

**Security notes**: The message-leak prevention (raw error text only shown when explicitly intended via `.status`) is the key security property of this file — it stops MongoDB driver errors, stack traces, or other internals from reaching API responses.

---

## utils/

### utils/jwt.js

**Purpose**: Issues and verifies the short-lived access-token JWT.

**Imports**: `jsonwebtoken`, `dotenv`.

**Functions/exports**: `signAccessToken(payload)` — signs with `process.env.JWT_SECRET`, `expiresIn: ACCESS_TOKEN_TTL` (`'15m'`); `verifyAccessToken(token)` — verifies signature and expiry, throws on failure; exports `ACCESS_TOKEN_TTL` too (also referenced conceptually by `utils/cookies.js`'s matching cookie `maxAge`).

**Callers**: `authController.js` (`issueSessionCookies` → `signAccessToken`), `authMiddleware.js` (`verifyAccessToken`).

**Callees**: `jsonwebtoken` npm package only.

**Security notes**: The 15-minute TTL is deliberately short — comments explain this is the token that matters if it's ever stolen (attached to every request); the actual "stay logged in" duration is governed by the separate, longer-lived refresh token (`utils/sessions.js`), not this one.

---

### utils/cookies.js

**Purpose**: Centralizes every cookie name, option, and set/clear operation for the three auth-related cookies (access JWT, refresh token, CSRF token) so their security attributes can't drift out of sync across call sites.

**Imports**: Node's `crypto`.

**Constants/exports**: `AUTH_COOKIE = 'fute_token'`, `REFRESH_COOKIE = 'fute_refresh'`, `CSRF_COOKIE = 'fute_csrf'`; `ACCESS_COOKIE_MAX_AGE` (15 min, mirrors `jwt.js`), `REFRESH_COOKIE_MAX_AGE` (7 days, mirrors `sessions.js`).

**Functions**: `baseCookieOptions()` — `httpOnly: true`, `secure`/`sameSite` conditional on `isDeployed` (`Boolean(process.env.VERCEL)`): deployed → `secure: true, sameSite: 'none'` (required for a cross-origin cookie to be sent at all, which itself requires HTTPS); local dev → `secure: false, sameSite: 'lax'` (frontend and backend share the `localhost` registrable domain locally, so `Lax` + plain HTTP works). `setAuthCookie`/`clearAuthCookie` — access token, always short-lived regardless of "remember me". `refreshCookieOptions(remember)`/`setRefreshCookie`/`clearRefreshCookie` — scoped to `path: '/api/auth'` only (never sent on other requests); `remember: true` sets a 7-day `maxAge`, otherwise the cookie has no `maxAge` at all (a true browser-session cookie, cleared when the browser itself closes). `setCsrfCookie(res, remember)`/`clearCsrfCookie` — generates a random 24-byte hex token (`crypto.randomBytes(24)`), sets it **not httpOnly** (must be JS-readable so the frontend can echo it back as a header — this is what makes the double-submit check work), with the same `remember`-based lifetime as the refresh cookie (so it doesn't expire before the session it's protecting does).

**Callers**: `authController.js` (register/login/refresh/logout).

**Callees**: Node `crypto`.

**Security notes**: The `isDeployed` branch is a load-bearing security detail — getting `SameSite=None` without `Secure` would be rejected by modern browsers, and using `SameSite=None` unnecessarily in local dev would just be a needless cross-site exposure with no benefit. The CSRF cookie being deliberately non-httpOnly is explained in-line as safe specifically because same-origin policy still prevents a *different* origin's JS from reading it, even though it doesn't stop the browser from *sending* it.

---

### utils/sessions.js

**Purpose**: Implements server-side session tracking backing refresh-token rotation, remote session revocation ("force logout"), and refresh-token-reuse detection (a stolen/replayed refresh token attack indicator).

**Imports**: Node `crypto`, `config/db`.

**Collection**: `sessions` (`SESSIONS` export, reused directly by `dashboardController.js`, `securityController.js`).

**Functions/exports**:
- `hashToken(token)` — SHA-256 hex digest. Refresh tokens are opaque random values (not JWTs — nothing to decode); only the **hash** is ever persisted, so a leaked `sessions` collection can't be replayed as a live cookie value (same principle as password hashing).
- `createSession({uid, ip, userAgent, refreshToken, remember})` — inserts one `sessions` doc per successful login/register: `uid`, `ip`, `userAgent`, `loginAt`, `revoked: false`, `remember`, `refreshTokenHash`, `previousRefreshTokenHash: null`, `refreshExpiresAt` (`REFRESH_TTL_MS = 7 days` from now). Returns `{id, ...doc}`.
- `isSessionRevoked(sessionId)` — checked by `authMiddleware` on every request; cached 30s per session id (`revokedCache` Map, same pattern as the two middleware caches above). A missing `sid` (a pre-session-tracking-era token) is treated as **not revocable**, not as revoked — avoids locking out everyone who logged in before this feature shipped.
- `clearRevokedCache(sessionId)` — invalidates the cache immediately after a revoke/logout write, so revocation is felt on the very next request rather than waiting out the 30s TTL.
- `consumeRefreshToken(presentedHash, {ip, userAgent})` — the refresh-rotation core, run inside `db.runTransaction`. Looks up a session by **current** `refreshTokenHash` match: if `revoked` → `{ok:false, reason:'revoked'}`; if expired → `{ok:false, reason:'expired'}`; otherwise rotates: generates a new raw refresh token, stores its hash as the new `refreshTokenHash`, moves the just-used hash into `previousRefreshTokenHash`, bumps `refreshExpiresAt`, returns `{ok:true, uid, newRawRefreshToken, session:{id, remember}}`. If no session matches the **current** hash, it checks whether the presented hash matches a **previous** (already-rotated-out) hash — a match there means the token was reused (the legitimate client already moved past it via an earlier refresh), so the **entire session is revoked** (`revoked:true, revokedReason:'refresh_token_reuse'`) rather than granting yet another token to what is presumably an attacker holding a stolen copy. Wrapped in a transaction specifically so two concurrent refresh calls for the same session can't both read the same stale hash and both "succeed."

**Callers**: `authController.js` (`refresh`, `logout` — via `SESSIONS.doc(sid).set({revoked:true})`), `securityController.js` (`revokeSession`, `forceLogoutUser`, `listSessions`), `dashboardController.js` (active-session count).

**Callees**: `config/db.js` (including `db.runTransaction`).

**Security notes**: This file implements refresh-token-reuse detection, a real defense against stolen-refresh-token replay — the single most security-sensitive piece of logic in the session system. The transaction wrapping is what prevents a race between two simultaneous refresh attempts from corrupting rotation state.

---

### utils/respond.js

**Purpose**: The single place every controller sends an HTTP response through, guaranteeing one consistent wire format across the whole API (previously ~15 controllers each picked their own ad hoc shape).

**Functions/exports**: `ok(res, data=null, {message, meta, status=200})` → `{success:true, message, data[, meta]}`; `created(res, data, message)` → same as `ok` with `status:201`; `noContent(res)` → bare `204`; `fail(res, {status=500, message, code='INTERNAL_ERROR', details=null})` → `{success:false, message, error:{code, details}}`.

**Callers**: Every controller and middleware file in the codebase.

**Callees**: None (pure Express `res` wrapper).

**Frontend coupling note** (from source comments): `main/frontend/src/utils/api.js` has a response interceptor that unwraps `{success:true, data}` back down to bare `data`, and folds `{success:false, message}` into a flat `.error` string — so this envelope changed the real HTTP contract without requiring every frontend call site to be rewritten.

---

### utils/pagination.js

**Purpose**: Implements Firestore-style keyset (cursor) pagination on top of `config/db.js`'s query builder, replacing what used to be full-collection reads on every poll.

**Imports**: `config/db` (`FieldPath`).

**Constants/exports**: `PAGE_SIZE = 20`.

**Functions**: `decodeCursor(raw)` — splits an opaque cursor string `"<value>|<id>"` on the **last** `|` (the doc id is the tiebreaker so two docs sharing the same ordering-field value still paginate deterministically). `encodeCursor(lastDoc, field)` — builds that same string from the last doc of a page; returns `null` if the ordering field is missing on that doc (rather than encoding the literal string `"undefined"`, which would corrupt the next page's comparison) — this deliberately mirrors Firestore's old behavior of silently dropping docs missing the `orderBy` field from ordered results. `paginatedQuery(query, field, after)` — orders by `field desc`, then `FieldPath.documentId() desc` as tiebreaker, applies `startAfter` if a cursor was given, fetches `PAGE_SIZE` docs, and returns `{docs, nextCursor}` (`nextCursor` is `null` once a page comes back short, signaling the last page).

**Callers**: `hrController`/`itController` (via `complaintControllerFactory.getAllComplaints`), `approvalController.listApprovals`, `leaveController.getAllLeaves`, `assetController.getAllAssets`, `renderController.getAllRenders`, `taskProjectController.getTasks`.

**Callees**: `config/db.js`.

---

### utils/upload.js

**Purpose**: Configures the two `multer` upload middlewares used across the app — one for small documents (PDF/JPG/Word), one for Excel spreadsheet imports.

**Imports**: `multer`.

**Exports**: `upload` — `multer.memoryStorage()` (files never touch disk before the controller decides where they go — see `16-file-storage.md`), 10MB limit, `fileFilter` restricting to `application/pdf`, `image/jpeg`, `image/jpg`, `application/msword`, and the `.docx` MIME type; rejects with a `400`-status error otherwise. `uploadSpreadsheet` — same memory-storage pattern, 15MB limit, restricted to the two common `.xlsx` MIME types.

**Callers**: `hrDeskRoutes.js` (`upload.single('file')` on employee-document and document-template routes), `salesDeskRoutes.js` (`uploadSpreadsheet.single('file')` on the lead-import route).

**Security notes**: MIME-type allow-listing happens here (server-side, not trusting a client-supplied file extension); actual file-content sniffing beyond the browser-reported MIME type is **not performed** — see `15-security.md`'s "potential weakness" section.

---

### utils/mailer.js

**Purpose**: Wraps `nodemailer` for the whole app's transactional email (new-complaint notifications, status-update notifications, HR Desk's Send Email feature, approval/remark notifications to the Founder).

**Imports**: `nodemailer`, `dotenv`.

**Setup**: A single `transporter` built from `SMTP_HOST`/`SMTP_PORT`; `auth` block is only included if `SMTP_USER` is set (the default self-hosted `maildev` capture server takes no auth at all, and `nodemailer` errors on an auth block with empty credentials).

**Functions/exports**: `sendMail(to, subject, html)`; `newComplaintEmail(token, submitterName, dept, priority)` and `statusUpdateEmail(token, newStatus, updatedBy)` — HTML templates for the two complaint-lifecycle emails; `escapeHtml(str)` — escapes `& < > " '` before any user-supplied string (submitter name, department, etc.) is interpolated into an HTML email body, preventing HTML/link injection into a notification email.

**Callers**: `complaintControllerFactory.js`, `approvalController.js`, `hrDeskController.js` (`sendEmail`, and via its `notifyFounder` helper).

**Security notes**: `escapeHtml` is a genuine, deliberate XSS/injection mitigation for anything user-supplied that ends up in an email body — every caller that builds HTML from user input goes through it.

---

### utils/constants.js

**Purpose**: Centralizes read-size caps that used to be a bare `200` literal repeated across roughly 18 call sites in 9 files, so changing the cap is one edit.

**Exports**: `UNPAGINATED_READ_LIMIT = 200` — default cap for endpoints reading a whole collection without cursor pagination. `FOUNDER_LIST_CAP = 200` — same value today, tracked separately because it specifically governs whether the founder-side merged HR+IT views set the `X-Results-Truncated` response header. `DASHBOARD_SCAN_CAP = 5000` — larger cap for `dashboardController.js`/`slaController.js`'s full-field scans, which need per-document data (not just a count) and so can't use `.count()`.

**Callers**: Nearly every controller doing an unpaginated `.limit(...)` read.

---

### utils/auditLog.js

**Purpose**: Appends an entry to the `audit_logs` collection for administrative actions (user create/update/delete, permission changes, department changes, session revocations, etc.).

**Functions/exports**: `logAudit({actor, action, target, details})` — writes `{actor_id, actor_email, actor_name, action, target, details, created_at}`. `AUDIT_LOGS` — the raw collection reference, reused directly by `superAdminUserController.getAuditLogs` and `dashboardController.getActivityTimeline`.

**Callers**: `departmentController.js`, `permissionController.js`, `slaController.js`, `notificationController.js`, `securityController.js`, `superAdminUserController.js` — essentially every Super Admin write action.

**Design note**: Callers `await` this call, but by the time it runs the underlying action has already succeeded — an audit-log write failure is not meant to roll back or fail the action it's recording (though the code does not explicitly catch a failure here, so in practice a write error would currently propagate and fail the request; see `14-error-handling.md`).

---

### utils/notificationRules.js

**Purpose**: Loads/merges the configurable "should this trigger send an email" rules (`settings/notification_rules` doc) that gate the HR/IT new-complaint and status-update mail sends.

**Exports**: `NOTIFICATION_RULES_DOC` (the doc reference, read/written directly by `notificationController.js`), `DEFAULT_NOTIFICATION_RULES` (`it_new_complaint`, `it_status_update`, `hr_new_complaint`, `hr_status_update`, each `{enabled: true[, recipientEmail:'']}`), `loadNotificationRules()` — merges stored overrides onto the defaults per key so a partially-configured doc still yields a complete rule set.

**Callers**: `complaintControllerFactory.js` (create/status-update mail gating), `notificationController.js` (the read/write API endpoints).

---

## routes/

Each route file wires HTTP verb + path → `authMiddleware` → `roleMiddleware`/`requirePermission` → controller function. None contain business logic themselves — see `04-api-documentation.md` for the full endpoint table and `08-authorization.md` for the complete role matrix. Notable structural points, file by file:

### routes/authRoutes.js
Defines its own `authLimiter` (`express-rate-limit`, 10 requests/15 min per IP) applied to `/register`, `/login`, `/refresh`, and `/verify-password` — on top of the account-level lockout in `authController.js` — specifically to stop distributed guessing across many accounts or registration spam from one source. `/refresh` deliberately has **no** `authMiddleware` (it authenticates itself off the refresh cookie, by design — the whole point is to work after the access token has expired).

### routes/hrRoutes.js / routes/itRoutes.js
Both mount the six-endpoint complaint CRUD shape from their respective controllers (`hrController.js`/`itController.js`, both built by `complaintControllerFactory.js`), plus a `GET /staff` (via `staffController.listStaffByRole`). `itRoutes.js` additionally mounts the four `/assets` routes with the extra `requirePermission('assets', action)` layer described above.

### routes/founderRoutes.js
The largest route file — aggregates nine controllers' worth of Super Admin/Founder surface (user management, analytics, system settings, permissions, departments, SLA, notification rules, dashboard/search). Defines a dedicated `expensiveReadLimiter` (20 requests/minute) applied to the analytics/CSV-export/dashboard-overview/SLA-compliance routes specifically, since those bypass their own short in-memory cache whenever the caller varies query params.

### routes/hrDeskRoutes.js
Mounts a large set of individually-named routes (attendance self-service, extra hours, document upload/download, employee documents) plus a `for...of` loop over nine "plain CRUD" sub-resources (`employees`, `candidates`, `interviews`, `meetings`, `attendance`, `feedback`, `jobs`, `performance`, `leave-entries`) generated from `hrDeskController.js`'s `makeCrud` factory outputs — with two carve-outs: `employees` skips the generic `list` route (it has its own richer `GET /employees` with a wider role including `coordinator`), and `attendance` skips generic `create`/`update` (writable only through the dedicated check-in/check-out endpoints).

### routes/salesDeskRoutes.js, routes/leaveRoutes.js, routes/approvalRoutes.js, routes/coordinatorRoutes.js, routes/renderRoutes.js, routes/securityRoutes.js, routes/chatRoutes.js
Each a straightforward mapping of verb+path to one controller module; see `04-api-documentation.md` for the exact table. `approvalRoutes.js`'s comment notes that the finer-grained "which categories can HR decide" check happens inside `decideApproval` itself, not at the route, since a request's category isn't known until the approval doc is read.

---

## controllers/

### controllers/authController.js

**Purpose**: Implements registration, login, token refresh, "who am I," password re-verification, and logout — the entire authentication lifecycle.

**Imports**: `crypto`, `config/db` (`auth`, `db`), `utils/jwt` (`signAccessToken`), `utils/sessions` (`createSession`, `SESSIONS`, `clearRevokedCache`, `consumeRefreshToken`, `hashToken`), `utils/respond` (`ok`, `created`, `fail`), `utils/cookies` (all six cookie helpers plus `REFRESH_COOKIE`, `CSRF_COOKIE`).

**Constants**: `LOCK_THRESHOLD = 5` — consecutive failed logins before an account is locked (fixed in code, not a configurable setting). `PASSWORD_LOGIN_ENABLED = true` — a documented toggle; both code paths (with/without password check) are kept intact so flipping it back is a one-line change.

**Functions/exports** (all are route handlers): 
- `issueSessionCookies(res, {id, email, role, full_name, sessionId, remember})` — the single place that signs the access JWT and sets all three cookies (access/refresh-is-separate/csrf) together, called by register/login/refresh so they can't drift out of sync. Returns the CSRF token value so callers can also put it in the JSON response body (needed because some browsers block page JS from reading a cross-site cookie via `document.cookie` even when it's non-httpOnly — confirmed behavior noted in the source comments).
- `register(req, res)` — `POST /api/auth/register`. Validates `email/password/full_name` present and password ≥ 10 chars; calls `auth.createUser`; **always** creates the account with `role: 'employee'` — self-registration can never grant a privileged role (a past bug let a caller-supplied email string be pattern-matched into `hr`/`it`/etc.; that path is gone). Writes the `users` profile doc, creates a session, issues cookies, responds `201`.
- `login(req, res)` — `POST /api/auth/login`. Resolves the account by email **before** checking the password (so a lockout can be checked up front and a failed attempt recorded against the right user even on a wrong password). Checks `preUser.locked` → `423 ACCOUNT_LOCKED`. If `PASSWORD_LOGIN_ENABLED`, verifies via `auth.verifyPassword`; on failure increments `failedLoginAttempts`, locks the account at `LOCK_THRESHOLD`, records a `failed_logins` doc, returns `401 INVALID_CREDENTIALS` either way (same message whether the email or password was wrong — prevents user enumeration). Checks `active === false` → `403 ACCOUNT_DEACTIVATED`. Resets `failedLoginAttempts` to 0 on a successful login. Creates a session (honoring `remember`), issues cookies, responds with the full profile payload.
- `refresh(req, res)` — `POST /api/auth/refresh`. Reads the raw refresh cookie, calls `consumeRefreshToken(hashToken(rawToken), {...})`; on any failure (expired/revoked/reused) clears all three cookies and returns `401 SESSION_EXPIRED`. On success, re-checks the user still exists and is active, then re-issues all three cookies (rotating the refresh token too).
- `getMe(req, res)` — `GET /api/auth/me`. Re-fetches the caller's own profile fresh from the DB (role/department/permissionOverrides may have changed since login) and also echoes back the current CSRF cookie value in the response body — a workaround for the browser cookie-read restriction mentioned above; this endpoint runs on every page load, closing the gap for a tab whose session predates any login/refresh call in that tab.
- `verifyPassword(req, res)` — `POST /api/auth/verify-password`. Re-authentication for risk-tiered confirm dialogs (delete user, force logout). Verifies against `req.user.email` (from the JWT) — **never** a client-supplied email — so it can't be used to probe another account's password.
- `logout(req, res)` — `POST /api/auth/logout`. Revokes the caller's own session doc (`revoked: true`) if it has a `sid` (older tokens predate session tracking and are simply no-ops here), clears the cache, clears all three cookies.

**DB/API interaction**: Collections `users`, `_auth_credentials` (via `auth.*`), `sessions`, `failed_logins`. Routes: all of `authRoutes.js`.

**Error handling**: Validation failures return `400 VALIDATION_ERROR`; auth failures return specific 401/403/423 codes as listed above; unexpected errors fall through to `errorMiddleware`.

**Security notes**: Account lockout, per-IP + per-account rate limiting (route-level `authLimiter`), password length floor (10 chars, stronger than Firebase Auth's old 6-char default), uniform "Invalid credentials" message regardless of failure reason, self-registration role pinned to `employee`, and the deliberate re-auth-off-JWT-not-body-email pattern in `verifyPassword` are all explicit, documented security controls in this file.

---

### controllers/complaintControllerFactory.js

**Purpose**: The shared implementation behind both the HR and IT ticket ("complaint") queues. `hrController.js` and `itController.js` used to be near-identical hand-copied files that had already begun drifting; this factory is the single place that logic now lives, parameterized by an `opts` object describing each queue's real differences.

**Imports**: `config/db` (`db`), `utils/constants` (`UNPAGINATED_READ_LIMIT`), `utils/mailer` (`sendMail`, `newComplaintEmail`, `statusUpdateEmail`), `utils/notificationRules` (`loadNotificationRules`), `utils/pagination` (`paginatedQuery`), `utils/respond` (`ok`, `created`, `fail`).

**`opts` shape** (documented in a JSDoc block in the source): `collectionName` (`'hr_complaints'`|`'it_complaints'`), `tokenPrefix` (`'HR'`|`'IT'`), `requiredFields` (extra required body fields), `buildDocData(base, body, ctx)` (queue-specific extra fields), `notifyNewComplaintRuleKey`/`notifyEmailEnvVar`, `notifyStatusUpdateRuleKey`, `buildApprovalRecord(data, previousStatus, id)`, `editableFields` (staff PATCH allow-list), `ownerEditableFields` (submitter's own PATCH allow-list), `staffRole`.

**Helper functions**: `generateToken(prefix)` — 6-char random alphanumeric suffix, formatted `FT-{prefix}-{XXXXXX}`. `calcDuration(complaintDate)` — human string ("3 hour(s)", "2 day(s)", etc.) from elapsed time. `sortByRecent(docs)` — sorts by `submitted_at` descending in JS (needed because the Mongo/Firestore-shim query itself is deliberately left unordered on some reads — an `orderBy` on a field some legacy docs lack would silently drop them from the result set). `enrichWithUserRole(docs)` — bounded, deduped lookup against `users` **only** for docs missing both `role`/`user_role` (most docs have these set at creation time already), resolving a display role from department/designation/role.

**`createComplaintController(opts)` returns** `{createComplaint, getAllComplaints, getMyComplaints, searchByToken, updateStatus, updateFields, deleteComplaint, reopenComplaint}`:

- `createComplaint(req, res)` — `POST .../complaints`. Validates shared required fields (`name, department, description, complaint_date, priority`) plus `opts.requiredFields`. Resolves `resolvedEmployeeId`/`dbUserRole` from the caller's `users` doc if not supplied. Builds the doc (token, ids, `status:'Pending'`, `solver: opts.defaultSolver`, merged with `opts.buildDocData(...)`), writes it, then best-effort sends the "new complaint" notification email if `loadNotificationRules()[opts.notifyNewComplaintRuleKey].enabled` (mail failure is caught and logged, never fails the request).
- `getAllComplaints(req, res)` — `GET .../complaints?after=` — staff/founder view, paginated via `utils/pagination.js`, enriched, sorted.
- `getMyComplaints(req, res)` — `GET .../complaints/my` — caller's own, bounded at `UNPAGINATED_READ_LIMIT`, unordered query + JS sort (same legacy-doc reasoning as above).
- `searchByToken(req, res)` — `GET .../complaints/search?token=` — exact match on the uppercased token.
- `updateStatus(req, res)` — `PATCH .../complaints/:id/status` — staff/founder only (route-level). Runs the ticket-status update **and** the conditional creation of an `approvals` doc (only on a genuine transition **into** `'Waiting Approval'`, checked via `previousStatus` inside the transaction — prevents duplicate approval records from a double-submit) inside one `db.runTransaction`, so a crash between the two writes can never strand a ticket showing "Waiting Approval" with no linked approval record. Sends the status-update email to the original submitter afterward (best-effort).
- `updateFields(req, res)` — `PATCH .../complaints/:id/fields` — allows either the ticket's own submitter (restricted to `opts.ownerEditableFields`, e.g. description/category/priority only) or staff/founder/superadmin (`opts.editableFields`, the fuller set including `solver`/`remarks`/`employeeStatus`) to patch. This distinction is a deliberate fix: without it, an owner could also self-assign or self-resolve their own ticket.
- `deleteComplaint(req, res)` — `DELETE .../complaints/:id` — **only** the original submitter (never staff/founder — they resolve via status instead); also deletes any linked `approvals` doc (matched by `complaintRef.collection`/`complaintRef.id`) in the same batch, so the Founder's approval queue never shows a decision UI for a ticket that no longer exists.
- `reopenComplaint(req, res)` — `PATCH .../complaints/:id/reopen` — owner-only, only from `status === 'Completed'`, resets to `Pending`/`Active`. This is the submitter's own re-open path, distinct from (and narrower than) the staff-only status route.

**DB/API interaction**: `hr_complaints`/`it_complaints` (per instantiation), `users` (enrichment), `approvals` (linked records).

**Error handling**: Validation → `400`; not-found → `404`; ownership/role violations → `403`; the transaction in `updateStatus` throws `Object.assign(new Error(...), {status:404})` for a missing doc, caught and translated via `.catch()`.

**Security notes**: The owner-vs-staff field split in `updateFields`, the owner-only delete/reopen, and the atomic transaction in `updateStatus` are all explicit fixes to real historical bugs referenced in the source comments (self-resolve/reassign, orphaned approval records).

#### Instantiation: controllers/hrController.js
`createComplaintController({ collectionName: 'hr_complaints', tokenPrefix: 'HR', notifyNewComplaintRuleKey: 'hr_new_complaint', notifyEmailEnvVar: 'HR_EMAIL', notifyStatusUpdateRuleKey: 'hr_status_update', editableFields: [employeeStatus, solver, remarks, employeeId, description, category, sub_category, priority], ownerEditableFields: [description, category, sub_category, priority], staffRole: 'hr', defaultSolver: 'Unassigned', buildDocData: sets category/sub_category defaults, buildApprovalRecord: {source:'HR', title:`HR Request - ${name}`, category:'HR', ...} })`.

#### Instantiation: controllers/itController.js
`createComplaintController({ collectionName: 'it_complaints', tokenPrefix: 'IT', requiredFields: [category, sub_category], notifyNewComplaintRuleKey: 'it_new_complaint', notifyEmailEnvVar: 'IT_EMAIL', notifyStatusUpdateRuleKey: 'it_status_update', editableFields: [...HR's set, plus vpnNo], ownerEditableFields: [description, category, sub_category, priority], staffRole: 'it', defaultSolver: 'Unassigned', buildDocData: resolves `department` from the user's profile when not supplied/'General', carries `approval`/`vpnNo`, buildApprovalRecord: {source:'IT', title:`${category} - ${sub_category}`, category: data.category, ...} })`. The extra `vpnNo` field and the department-resolution fallback are IT-specific and are the two concrete differences the source comments call out as the reason IT and HR had "already started drifting" before this factory existed.

---

### controllers/approvalController.js

**Purpose**: Implements the Founder's central Approval Center — the queue that ticket-status escalations ("Waiting Approval"), document uploads, extra-hours submissions, and manual IT/HR requests all funnel into for a decision.

**Constants**: `HR_DECIDABLE_CATEGORIES = ['document']` — only the `'document'` category may be decided by an `'hr'` user; every other category (including `'extra-hours'`, decided separately) is founder-only.

**Functions/exports**:
- `createApproval(req, res)` — `POST /api/approvals` — manual request (asset/data requests) raised directly by IT/HR desks, distinct from the automatic ones the complaint factory creates.
- `listApprovals(req, res)` — `GET /api/approvals?after=` — paginated feed read by IT/HR (their own requests) and the founder (to decide).
- `decideApproval(req, res)` — `PATCH /api/approvals/:id/decide` — the most complex function in this file. Runs entirely inside `db.runTransaction`: re-reads the approval and rejects (`409 CONFLICT`) if it's already been decided (guards against a double-submit/retried request or two founder tabs); enforces the role check **inside** the transaction (founder always; `hr` only for `HR_DECIDABLE_CATEGORIES`) since the category isn't known until the doc is read; if the approval is linked to a ticket (`complaintRef`) or an extra-hours entry (`extraHoursId`), updates that linked document's status in the same transaction (`In Progress` on approval, or back to `previousStatus` on rejection for tickets); sends a founder-notification email afterward only when HR (not the founder) made the decision.
- `addRemark(req, res)` — `POST /api/approvals/:id/remarks` — appends `{text, by, at}` to the approval's `remarks` array; always emails the Founder.

**DB/API interaction**: `approvals` collection; conditionally `hr_complaints`/`it_complaints`/`extra_hours` via linked refs; `users` (to find founders to notify).

**Security notes**: The double-decision guard and the transactional linked-ticket update are both explicit fixes noted in the source ("previously these were two independent writes... could strand a ticket... forever").

---

### controllers/assetController.js

**Purpose**: IT asset inventory CRUD.

**Functions/exports**: `createAsset` — `id` is a **caller-typed business identifier** (e.g. `"AST-1006"`), validated against `/^[\w-]+$/`, and used directly as the Mongo/Firestore-shim document id (matching the pre-existing mock-data convention); `409 ASSET_ALREADY_EXISTS` if that id is taken. `getAllAssets` — paginated. `updateAsset` — full-record edit against a fixed `EDITABLE_FIELDS` allow-list. `deleteAsset`.

**DB/API interaction**: `assets` collection. Routes: `itRoutes.js` (gated additionally by `requirePermission('assets', action)`).

---

### controllers/chatController.js

**Purpose**: Backs the Team Chat feature — fixed/broadcast channels, per-project channels, and 1:1 direct messages, all stored in one flat `chat_messages` collection keyed by a `channelId` string.

**Key design**: A DM channel's id **encodes both participants**: `dm-<uidA>-<uidB>` with the two uids sorted so either side opens the same channel id (`makeDmChannelId`). Non-DM channel ids (`general`, `it-support`, `project-<id>`, etc.) carry no such encoding and are open to any authenticated user — same open-access posture as `taskProjectController.getProjects`.

**Functions/exports**: `canAccessChannel(channelId, userId)` — for a DM channel, the caller must be one of the two encoded participants; anything else is open. `listMessages(req,res)` — `GET /:channelId/messages?since=` — no `since` returns the most recent `HISTORY_LIMIT=50` messages (fetched newest-first, then reversed to oldest-first for display); with `since`, returns only messages after that ISO timestamp, ascending — this is the polling client's incremental-fetch path. `sendMessage(req,res)` — `POST /:channelId/messages` — sender identity (`senderId`, `senderName`, `senderRole`) always comes from `req.user`, never the request body. `directory(req,res)` — `GET /directory` — a deliberately minimal people list (id, name, role, department only — no email/permissions) for the DM-picker UI, open to any authenticated user. `resolveDmChannel(req,res)` — `GET /dm/:otherUserId` — computes (but does not persist — the channel "exists" implicitly the moment a message is posted into it) the DM channel id for the caller + the target user.

**DB/API interaction**: `chat_messages`, `users` (directory).

**Security notes**: The 403 access check on both read and write for DM channels is the key access control here — without `canAccessChannel`, any authenticated user could read or post into any other pair's DM by guessing/constructing the `dm-<uid>-<uid>` id.

---

### controllers/dashboardController.js

**Purpose**: Powers the Super Admin landing page (`GET /api/founder/dashboard-overview`), the global search bar, the merged activity timeline, and per-admin dashboard-widget layout persistence.

**Functions/exports**:
- `summarizeQueueForOverview(snap, queuePolicies)` — computes open/pending/resolved/high-priority-open/overdue counts and average resolution time for one ticket queue snapshot, checking each open ticket's age against its priority's SLA `resolutionMinutes` (reusing the exact same policy source `slaController.js`'s SLA Management page configures, so the two views can never disagree about what counts as a breach).
- `computeDashboardOverview()` — the core aggregation, **cached 30 seconds** (`DASHBOARD_CACHE_MS`, module-level `dashboardCache`) since this is the single most-hit endpoint in the app. Fires roughly 11 queries in parallel via `Promise.all` — six as `.count().get()` calls (cheap, count-only) and five as full-field scans bounded by `DASHBOARD_SCAN_CAP` (5000) because they need actual field data (role, SLA timestamps, warranty dates), not just a count. Composes `organization` (headcount/role breakdown), `it`/`hr` (queue summaries), `systemHealth` (some sections honestly report `tracked: false` — storage usage, failed background jobs, integration sync — rather than fabricate a number the app has no real data source for), `security` (active sessions, failed logins in 24h, locked accounts), and a `requiresAttention` list of only the non-zero alert conditions.
- `getDashboardOverview(req,res)` — thin wrapper returning the cached/computed result.
- `search(req,res)` — `GET /api/founder/search?q=` — an **in-memory substring match** over bounded reads (300 users, `UNPAGINATED_READ_LIMIT` each for tickets/assets/departments) — explicitly marked in the source with a `ponytail:` comment as fine at the app's actual scale (dozens–low hundreds of docs per collection) but noted as needing real indexed search if any collection grows into the thousands.
- `getActivityTimeline(req,res)` — `GET /api/founder/activity-timeline?limit=` — merges `audit_logs` (admin actions) with derived ticket-created/updated and approval-created/decided events (since tickets/approvals don't store a full per-transition history, only their two real timestamps) into one chronological JS-sorted feed; sets `X-Results-Truncated: true` if any of the three capped source reads (`FOUNDER_LIST_CAP=200`) hit its cap.
- `updateDashboardLayout(req,res)` — `PATCH /api/founder/dashboard-layout` — persists `{widgets:[...]}` onto the **caller's own** `users` doc (per-admin preference, not global).

**DB/API interaction**: `users`, `departments`, `it_complaints`, `hr_complaints`, `approvals`, `leave_requests`, `assets`, `settings/sla_policies` (via `slaController`'s exported doc reference), `sessions`, `failed_logins`.

---

### controllers/departmentController.js

**Purpose**: CRUD for the standalone `departments` registry (a curated list, not derived from the free-text `department` field on user records, since that field is used inconsistently across other roles as job titles/team names).

**Functions/exports**: `listDepartments`, `createDepartment` (audit-logged), `updateDepartment` (audit-logged, logs before/after), `deleteDepartment` — refuses (`400 DEPARTMENT_IN_USE`) if any `users` doc still has `department` equal to this department's name, so deleting never orphans a reference.

**DB/API interaction**: `departments`, `users` (in-use check).

---

### controllers/leaveController.js

**Purpose**: Employee leave application and HR/Founder decision workflow.

**Functions/exports**: `isFounderApproval(department)` — leave from `'Admin/Ops'` or `'IT'` departments routes to the **Founder**, not HR, mirroring a rule that used to live in the frontend (`LeaveContext.jsx`), now driven by the requester's real profile department. `applyLeave` — any employee, for themselves. `getAllLeaves` — HR/founder, paginated. `getMyLeaves` — caller's own, bounded, JS-sorted. `decide` — enforces the founder-only routing rule for Admin/Ops and IT departments (`403` if an HR user tries to decide one of those).

**DB/API interaction**: `leave_requests`, `users` (department lookup on apply).

---

### controllers/notificationController.js

**Purpose**: Thin read/write API for the `settings/notification_rules` doc (the backend's mail-sending code reads `loadNotificationRules()` directly, not this HTTP endpoint — this controller exists only for the Super Admin UI to view/edit the rules).

**Functions/exports**: `getNotificationRules`, `updateNotificationRules` (full-document `.set()`, audit-logged).

---

### controllers/permissionController.js

**Purpose**: Read/write API for the two permission systems — page-level `role_permissions` (which nav pages a role can see) and action-level `action_permissions` (the finer-grained matrix `permissionMiddleware.js` enforces) — kept as two **separate** documents deliberately, so a page-visibility save (a full-object `.set()` from the toggle UI) can never silently wipe the action matrix.

**Functions/exports**: `getRolePermissions`/`updateRolePermissions` (superadmin write, audit-logged), `getActionPermissions`/`updateActionPermissions` (superadmin write, audit-logged, and **clears `permissionMiddleware`'s in-process cache** immediately via `clearActionPermissionsCache()`), `getPermissions` — a combined read of both docs in one round trip, since `PermissionsContext` on the frontend polls both together.

---

### controllers/renderController.js

**Purpose**: CRUD for the Production render-job tracker, also read by IT's "Rendering Status" view — no role restriction on any of its three routes (shared-context access, matching the original design).

**Functions/exports**: `getAllRenders` (paginated), `addRender`, `updateRender` (fixed `EDITABLE_FIELDS` allow-list).

**DB/API interaction**: `renders` collection.

---

### controllers/securityController.js

**Purpose**: Backs the Super Admin "Security Center" — session visibility/revocation, failed-login history, and account-lockout management. Every route here is superadmin-only (stricter than the general read-any/write-superadmin pattern used elsewhere).

**Functions/exports**: `listSessions` — optionally filtered by `uid`, joins in `email`/`full_name` from `users`. `revokeSession` — revokes one session doc, audit-logged. `forceLogoutUser` — revokes **every** active session for a uid in one batched write, so "force logout" is actually effective across every device, not just one. `listFailedLogins`. `listLockedAccounts`. `unlockAccount` — clears `locked`/`failedLoginAttempts`, audit-logged.

**DB/API interaction**: `sessions`, `users`, `failed_logins`.

---

### controllers/slaController.js

**Purpose**: Defines and evaluates SLA policy — per-queue (`it`/`hr`), per-priority (`High`/`Medium`/`Low` — there is no `Critical` tier since the ticket forms don't offer one), response/resolution time thresholds in minutes.

**Functions/exports**: `DEFAULT_SLA_POLICIES` (exported, reused by `dashboardController.js`). `getSlaPolicies`/`updateSlaPolicies` (readable by anyone logged in; superadmin writes only, audit-logged). `summarizeSlaForQueue(snap, queuePolicies)` — for completed tickets, compares actual resolution time against policy; for open tickets, compares current age against policy, flagging `breached` (past 100% of `resolutionMinutes`) vs. `nearBreach` (past 80%) vs. compliant; returns a `compliancePct` and up to 20 example breaches. `getSlaCompliance` — superadmin-only detailed view (`DASHBOARD_SCAN_CAP`-bounded scans of both queues).

**DB/API interaction**: `settings/sla_policies`, `it_complaints`, `hr_complaints`.

---

### controllers/staffController.js

**Purpose**: A single small factory, `listStaffByRole(roleName)`, returning a route handler that lists active users of one role (id + name only) — powers the "Resolved By" dropdown in the HR/IT ticket queues. Deliberately thinner than `superAdminUserController.listUsers` (no email/permission data).

---

### controllers/systemSettingsController.js

**Purpose**: Read/write API for the single `settings/system_config` document (SLA hours — legacy, now superseded in practice by `slaController.js`'s per-priority policies — working hours, holiday list).

**Functions/exports**: `getSystemSettings` (readable by anyone logged in), `updateSystemSettings` (superadmin write, merge-set, audit-logged).

---

### controllers/taskProjectController.js

**Purpose**: Backs Coordinator's task/project board, also read by Founder and each Employee's own "My Tasks/Projects" view.

**Functions/exports**: `getProjects` — reads `projects` unordered (no writer for this collection exists in the backend at all — it's seeded directly in the database — so a guaranteed `created_at` field can't be assumed). `getTasks` — role-scoped: an `employee` caller only ever sees tasks where `assignee === req.user.full_name`; coordinator/founder see the full paginated board. The source notes this closed a real bug: the frontend used to fetch every task in the system and filter client-side, meaning any employee account could actually read the whole org's task backlog (including PR/Figma links) straight from the API regardless of what the UI displayed. `createTask` (coordinator/founder). `updateTaskStatus` — open to any logged-in user, but only that specific task's own assignee (matched by full name) or a coordinator/founder may actually change it — not an arbitrary other employee who enumerates task ids from the open list endpoint. `updateTask` — full-field edit, coordinator/founder only (route-level).

**DB/API interaction**: `tasks`, `projects`.

---

### controllers/analyticsController.js

**Purpose**: Cross-department count/summary snapshot for the Super Admin Analytics page, plus a CSV export of the same data.

**Functions/exports**: `inDateRange(iso, from, to)` — a record with no date field is only included when **no** range filter is active (an honest under-count is judged safer than a silently-wrong inclusion under an active filter). `summarizeTicketDocs(docs)` — counts by status, average resolution hours for completed tickets. `rangedQuery(collectionRef, field, from, to)` — pushes the date-range filter into an actual `.where()` clause (not an in-memory filter over a full collection read), and caps every call — filtered or not — at `ANALYTICS_READ_CAP = 5000`, since the unfiltered default used to mean "read every doc in all 5 collections, forever," on what the source calls the single most expensive, most re-triggerable query in the app. `computeAnalytics({from,to})` — cached 60 seconds per date-range key (`ANALYTICS_CACHE_MS`, a `Map` keyed by `"from|to"`). `getAnalytics` — JSON. `csvEscape(value)`/`getAnalyticsCsv` — flat Section/Metric/Value CSV rows; `csvEscape` neutralizes CSV/formula injection by prefixing an apostrophe to any value starting with `= + - @` before Excel/Sheets would otherwise interpret it as a live formula on open.

**DB/API interaction**: `users`, `hr_complaints`, `it_complaints`, `approvals`, `leave_requests`.

---

### controllers/superAdminUserController.js

**Purpose**: The full Super Admin user-management surface — merged complaint view, user CRUD, permission-override editing, password reset, activate/deactivate, delete, and the audit-log reader.

**Constants**: `ASSIGNABLE_ROLES = ['it','hr','sales','coordinator','employee']` — roles Super Admin can hand-create an account as (deliberately excludes `founder`/`superadmin` — no self-service way to mint either). `EDITABLE_ROLES` — the same list **plus `founder`** — promoting an existing user to founder is allowed (superadmin outranks founder), but still never to a second superadmin.

**Functions/exports**:
- `getAllComplaints(req,res)` — `GET /api/founder/complaints` — merges HR+IT tickets, tags each with `dept_tag`, JS-sorts by `submitted_at`; sets `X-Results-Truncated: true` if either side hits `FOUNDER_LIST_CAP`.
- `listUsers(req,res)` — `GET /api/founder/users?role=` — returns a trimmed profile shape (no password data — that lives entirely in `_auth_credentials`, never exposed via this API).
- `updateUserPermissions` — replaces a user's whole `permissionOverrides` map (the frontend always sends the full merged object).
- `createUser` — validates role against `ASSIGNABLE_ROLES` and password ≥ 10 chars; unlike self-registration, **lets Super Admin explicitly choose the role**.
- `updateUser` — blocks editing your own account through this panel (`uid === req.user.id` → `400`), so Super Admin can never accidentally demote/deactivate themselves out of the panel; validates role against the wider `EDITABLE_ROLES`.
- `setUserActive` — toggles `active` (reversible — unlike delete), also disables the underlying auth credential (`auth.updateUser(uid, {disabled: !active})`); also blocked for your own account.
- `deleteUser` — irreversible; removes both the `_auth_credentials` entry and the `users` profile doc; blocked for your own account; tolerates an already-missing auth record (`auth/user-not-found`) rather than failing the whole delete.
- `resetUserPassword` — enforces the same 10-char floor, explicitly noted as important since this is the password set right after a lockout (a weak reset here would undermine the lockout protection it's meant to restore).
- `getAuditLogs` — `GET /api/founder/audit-logs?limit=` (capped at 500).

Every mutating action here calls `logAudit(...)`.

**DB/API interaction**: `users`, `_auth_credentials` (via `auth.*`), `hr_complaints`/`it_complaints` (merged view), `audit_logs`.

---

### controllers/hrDeskController.js

**Purpose**: The largest single controller (705 lines) — implements the entire HR Desk module: email sending, a generic CRUD factory reused across six HR sub-resources, employee document upload/download (local disk storage), reusable document templates, self-service attendance check-in/out, extra-hours logging with teammate mentions, and self-scoped leave/performance summaries.

**`sendEmail`/`getSentEmails`** — `POST`/`GET /api/hr-desk/send-email` — actually sends via the shared `mailer.js` transport, then records a `sent_emails` doc so the "Sent" folder reflects real history across sessions/devices, not just local UI state.

**`serializeDoc(data)`** — passthrough that converts any stray `Date` instance to an ISO string (defensive; every date field in this app is stored as a plain ISO string already, but this guards against `JSON.stringify` mangling a raw `Date` if one ever ends up in a doc).

**`makeCrud(collectionName, requiredFields, editableFields, options)`** — the generic factory behind Candidates, Interviews, Meetings, Attendance, Feedback, and Job postings (all share the exact same list/create/update/delete shape with no cross-resource logic). `options.transforms` — per-field value transform on write (e.g. `appliedOn` → ISO string). `options.trackUpdatedBy` — stamps `lastUpdatedBy` on create/update. `options.afterWrite` — a post-write side effect hook (used once, for `syncNextInterview`). Its `list()` deliberately performs **no** `.orderBy()` at the query level — sorting happens in JS after fetch — specifically so legacy/manually-added records missing a `created_at` field aren't silently dropped from the Firestore-shim's ordered-query behavior.

**`syncNextInterview(interview)`** — the one `afterWrite` hook in use: keeps `candidates.nextInterview` (a denormalized summary field used by the candidate list view to avoid a per-candidate interviews query) in sync whenever an interview is scheduled/rescheduled; best-effort (a missing/deleted candidate doesn't fail the interview write).

**`DOCUMENT_TYPES`** — a map of 13 named employee-document slots (Offer Letter Signed, NDA, Leave Policy, Code of Conduct, Old Appointment Letter, Relieving Letter, Aadhar/PAN/Voter ID, Drive Link Doc, plus 3 free "Other" slots), each declaring the two `employees` fields it owns (`urlField`, `fileNameField`).

**`uploadEmployeeDocument`/`downloadEmployeeDocument`** — see `16-file-storage.md` for the full upload/download/path-safety walkthrough; briefly: files are written to local disk under `uploads/employee-documents/<employeeId>/`, the employee doc is updated with a download-route URL + original filename + an internal `storagePaths.<docType>` value, an `approvals` doc (`category:'document'`) is created for HR/Founder sign-off, and the download route re-derives the absolute path from the stored relative path with a containment check (`absolutePath.startsWith(UPLOAD_ROOT)`) before serving.

**`createDocumentTemplate`/`updateDocumentTemplate`/`downloadDocumentTemplate`/`saveTemplateFile`** — a parallel, simpler local-disk-storage pattern for *reusable blank* templates (as opposed to a specific employee's signed copy); `saveTemplateFile` sanitizes the caller-supplied `category` before using it in a path, then re-verifies containment the same way.

**Attendance**: `findDocForDate`/`findTodayDoc` — single-doc lookups by `(employeeId, date)`, never a collection scan. `dateRange(from,to)` — capped at 60 days to stop a typo'd year from creating thousands of rows. `myTodayAttendance`/`myAttendanceHistory` — self-scoped via `req.user.employeeId`, never a client-supplied id. `checkIn` — `workMode: 'Leave'` marks a whole date range as leave (self-declared, no separate approval step — this is the *only* code path that can set `attendance.status = 'Leave'`); otherwise records a `"HH:MM"`-format check-in time and rejects (`409`) a duplicate check-in. `checkOut` — computes `hours` from the check-in/out time difference; rejects (`409`) checking out without a check-in or checking out twice.

**Extra Hours**: `submitExtraHours` — self-service (again, `req.user.employeeId`-scoped), creates both an `extra_hours` doc and a linked `approvals` doc (`category:'extra-hours'`, founder-only decision per `approvalController.js`'s `HR_DECIDABLE_CATEGORIES`), notifies the Founder. `myExtraHours`/`listExtraHours` — self vs. all. `myExtraHoursMentions` — a free-text name match (not a real user-id reference) against every entry's `teammates` array, powering an "X included you" notification.

**Leave/Performance**: `myLeaveSummary` — computes `remaining = entitlement - sum(taken across all leave_entries periods)`, entitlement falling back to `DEFAULT_LEAVE_ENTITLEMENT = 24` if not set on the employee record. `myPerformance` — self-scoped read of `performance_entries`.

**Module exports**: A large object combining named self-service functions with `makeCrud(...)` outputs for nine sub-resources (`employees` gets a very large `editableFields` array including every HR field and every `DOCUMENT_TYPES` url/filename pair; `document_templates`'s `create`/`update` are overridden with the multipart-aware functions since `makeCrud` only handles JSON bodies).

**DB/API interaction**: `sent_emails`, `document_templates`, `employees`, `candidates`, `interviews`, `meetings`, `attendance`, `interview_feedback`, `open_jobs`, `performance_entries`, `leave_entries`, `extra_hours`, `approvals`. Local disk under `uploads/`.

---

### controllers/salesDeskController.js

**Purpose**: The second-largest controller (703 lines) — Sales Desk lead CRUD, call logging, a two-format Excel import pipeline (a legacy "Bangalore list" format and a newer "Marketing Master Sheet" contact-level format), a CSV export, campaign/settings records.

**Basic CRUD**: `listLeads` (bounded at `SALES_LEADS_READ_LIMIT = 3000` — a dedicated, larger cap than `UNPAGINATED_READ_LIMIT` since real imports already produce hundreds of leads and this is expected to keep growing), `createLead`, `updateLead`, `deleteLead`, all against a fixed `EDITABLE_FIELDS` allow-list covering both the original lead fields and the newer Marketing Master Sheet fields (country, designation level, per-channel campaign status, etc.).

**`logCall(req,res)`** — `POST /leads/:id/log-call` — the single funnel every call/follow-up/meeting action goes through, appending a `{at, by, outcome, comment}` entry to the lead's `callLog` array via `FieldValue.arrayUnion` (the one Firestore write-transform this app uses) — deliberately distinct from a plain `PATCH`, so "Calls Today" / team-activity metrics count real logged calls, not incidental field edits.

**Excel import pipeline** — a large block of pure parsing helpers, none of which touch the database themselves:
- `normalizeName(name)` — strips legal-entity suffixes (Private/Pvt/Limited/Ltd/LLP/Corp) and punctuation so near-duplicate company names key together across sheets.
- `cellText(v)` — recursively unwraps ExcelJS's hyperlink-cell and rich-text-cell object shapes down to plain text (a naive `String(v)` on a rich-text hyperlink cell would otherwise stringify to the literal `"[object Object]"`).
- `headerMap(worksheet)`/`rowValue(row, map, header)` — builds a header-name→column-index map from row 1, then reads a named column by that map.
- `normalizeStatus(raw)` — maps the legacy "Frist" sheet's short status codes (`DNP`, `Positive`, `RCB`, etc.) onto the app's real status vocabulary, plus a casing fold for "Not interested"/"Not Interested".
- `readSheetRows`/`parseWorkbook` — the **legacy format** parser: `Frist` is the master list (every real row becomes a lead, keyed by normalized company name); `Second` and `Moving to sales team` are tracking overlays that either update a matching Frist-derived lead or create a new tracking-only lead if the company wasn't in Frist at all — the source notes these two sheets were verified **not** to be the same list at two stages (only ~67% overlap), so this builds a true union rather than a one-way overlay.
- `normalizeCity`, `designationLevelOf`, `normalizeEmailVerified`, `normalizePhoneVerified`, `normalizeEmailCampaign`, `normalizeWhatsappCampaign`, `normalizeLinkedinCampaign`, `normalizeLinkedinConnection`, `mapSaleStatus`, `priorityOf`, `leftOrganisationOf` — each a small free-text-to-enum normalizer specific to one Marketing Master Sheet column (e.g. `CITY_FIXES` hand-corrects known typos like `hydarebad`→`Hyderabad` rather than fuzzy-matching, since an auto-correction could silently merge two real distinct cities).
- `normalizeContactKey(companyName, contactName, email)` — keys a Marketing Master Sheet row by **contact**, not company (several real distinct contacts can share one company in this format, unlike the legacy one-lead-per-company format) — prefers email when present, else a normalized name+company composite.
- `isMarketingMasterSheet(workbook)`/`parseMarketingMasterWorkbook(workbook)` — detects the newer format by the presence of a `"Company Name"` header anywhere in the workbook (not by filename), then parses every matching worksheet (tagging `country: 'Australia'` if the sheet name matches `/australia/i`, else `'India'`), deduplicating by contact key across tabs (first occurrence wins).
- `importLeads(req,res)` — `POST /leads/import` (multipart `.xlsx`) — loads the workbook via `exceljs`, detects the format, parses, then **dedupes against what's already stored** (keyed by company for the legacy format, by contact for the Marketing Master format) so re-running an import — or importing a future overlapping city list — updates existing leads rather than duplicating them; writes in batches of 400 (under Mongo/Firestore's ~500 batch-write limit) via `db.batch()`. On an update, only sheet-sourced fields are overwritten — `dealValue`/`callLog` (never sheet-sourced) and, for the legacy format only, `priority` (a fixed default at parse time, not derived from the row — unlike the Marketing Master format, where `priority` *is* sheet-derived) are explicitly excluded from the overwrite so a rep's own manual edits aren't clobbered by a re-import.

**`exportEmailCampaign`** — CSV of leads that have an email, with the same CSV/formula-injection neutralization (`escapeCsv`, leading apostrophe on `= + - @`-prefixed values) seen in `analyticsController.js`.

**Settings/Campaigns**: `getSettings`/`updateSettings` — a single `sales_settings/config` doc (monthly revenue target, daily call target per rep). `listCampaigns`/`createCampaign`/`deleteCampaign` — **records only**, not an actual mass-mailer; the real send stays the existing email-campaign CSV export — this collection just tracks that a campaign happened so response rate has something to measure against.

**DB/API interaction**: `sales_leads`, `sales_campaigns`, `sales_settings`. Module also exports several parsing functions (`parseWorkbook`, `parseMarketingMasterWorkbook`, `normalizeName`, `normalizeCity`, `isMarketingMasterSheet`, `normalizeContactKey`) purely for testing/debugging the import mapping against a real file outside the HTTP layer — none of these exports are consumed by any route.

---

## package.json

### package.json

**Purpose**: Declares the backend's dependency set and npm scripts.

**Scripts**: `start` → `node server.js`; `dev` → `nodemon server.js`.

**Key production dependencies** (see `19-dependencies.md` for the full table): `express`, `express-async-errors`, `express-rate-limit`, `helmet`, `cors`, `cookie-parser`, `mongodb`, `bcryptjs`, `jsonwebtoken`, `multer`, `nodemailer`, `maildev`, `exceljs`, `dotenv`. Only dev dependency: `nodemon`.

**`overrides`**: pins transitive versions of `jose`, `qs`, and `maildev`'s own `nodemailer` dependency — Not determinable from the current codebase exactly which advisory/compatibility issue each override addresses; these are dependency-resolution pins, not application code.

**Testing**: No `test` script and no test runner listed in dependencies — see `21-testing.md`.

---

*End of file-by-file explanation. Total source covered: `server.js`, `config/db.js`, 5 middleware files, 9 utils files, 12 route files, and 22 controller files (counting `complaintControllerFactory.js` plus its two instantiations as three).*
