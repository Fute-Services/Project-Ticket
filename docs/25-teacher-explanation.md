# 25 — Teacher Explanation

This file teaches five core backend concepts using Fute Portal's own real code — not generic textbook examples. Each section follows WHAT / WHY / HOW / WHERE / WHEN / WHAT-IF.

---

## 1. Middleware (Express)

**WHAT.** Middleware is a function that runs *between* a request arriving and a response being sent. Each one gets `(req, res, next)` and either ends the request (calls `res.something()`) or calls `next()` to pass control to the next function in line.

**WHY.** Instead of every route handler repeating "check the request is from an allowed origin," "check there's a valid session," "check the CSRF token," you write that logic once and stack it in front of every route (or every route in a group) that needs it.

**HOW — the real chain in `server.js`:**
```js
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, ... }));
app.use(cors({ origin(origin, cb) { ... }, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(csrfMiddleware);          // middleware/csrfMiddleware.js
app.use('/api/hr', require('./routes/hrRoutes'));
```
Every single request — no matter which route it eventually hits — passes through `helmet`, the rate limiter, `cors`, `express.json()`, `cookieParser()`, and `csrfMiddleware` **in that order**, before Express even starts matching it against `/api/hr`, `/api/it`, etc. If `csrfMiddleware` calls `fail(res, {status: 403, ...})` instead of `next()`, the request never reaches any route handler at all.

Then, inside a route file, more middleware stacks per-route:
```js
// routes/hrRoutes.js
router.get('/complaints', auth, role('hr', 'founder'), getAllComplaints);
```
Here `auth` (== `authMiddleware`) and `role('hr','founder')` (== `roleMiddleware`) both have to call `next()` before `getAllComplaints` (the actual controller) ever runs.

**WHERE.** Global middleware lives in `server.js`. Per-route middleware is `middleware/authMiddleware.js`, `middleware/roleMiddleware.js`, `middleware/csrfMiddleware.js`, `middleware/permissionMiddleware.js`, `middleware/errorMiddleware.js` (this last one is special — see below).

**WHEN.** Global middleware runs on every request, always, before route matching. Per-route middleware runs only for routes that list it, and only if every middleware before it in that route's list called `next()`.

**WHAT-IF** a middleware throws an error, or a promise it returns rejects? Normally that would hang the request forever (Express doesn't catch async errors by default). `server.js` loads `express-async-errors` before any routes are required specifically to fix this — it patches Express so a rejected promise anywhere in the chain (middleware or controller) is forwarded to `errorMiddleware` (`middleware/errorMiddleware.js`), the one middleware that's registered *last*, after the 404 handler, and takes 4 arguments (`(err, req, res, next)` — that 4-argument signature is what tells Express "this is an error handler," not a normal one).

---

## 2. JWT access tokens

**WHAT.** A JSON Web Token (JWT) is a signed string encoding a JSON payload. "Signed" means anyone can *read* the payload (it's just base64), but only someone holding the secret key can produce a signature the server will accept as valid — so the server can trust the payload wasn't tampered with.

**WHY 15 minutes, and why a *separate* refresh token exists.** `utils/jwt.js`:
```js
const ACCESS_TOKEN_TTL = '15m';
function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}
```
The comment in that file explains the tradeoff directly: *"Short on purpose — this is the token that would matter if it ever leaked... The refresh token (sessions.js) is what actually keeps someone signed in; this just limits how long a stolen access token stays useful."* If someone steals a copy of the access token (e.g. an XSS bug reads it somehow), it's only useful to them for at most 15 minutes.

**HOW — what's actually in the payload.** From `controllers/authController.js`:
```js
const accessToken = signAccessToken({ id, email, role, full_name, sid: sessionId });
```
Just enough for `authMiddleware` to know *who* the user is and *which session* this token belongs to (`sid`). No password, no permission overrides, nothing that would be dangerous if a token's payload were read by someone who intercepted it — remember, JWT payloads are **not encrypted**, only signed. Verification (`verifyAccessToken`) is one line: `jwt.verify(token, process.env.JWT_SECRET)` — it throws if the signature doesn't match or the token has expired.

**WHERE.** The token itself lives in an `httpOnly` cookie (`fute_token`, set by `utils/cookies.js`'s `setAuthCookie`), so page JavaScript can never read it directly — only the browser attaches it automatically on requests, and only the server (`authMiddleware.js`) reads it via `req.cookies`.

**WHEN.** A new access token is issued on register, login, and every successful call to `POST /api/auth/refresh`. It's verified on every request that hits `authMiddleware` (i.e. almost every authenticated route).

**WHAT-IF** the access token expires mid-session? `authMiddleware.js`'s catch block treats an expired token exactly like an invalid one — a `401 INVALID_TOKEN`. The frontend's `axios` response interceptor (`main/frontend/src/utils/api.js`) catches that 401 and transparently calls `/api/auth/refresh` (which reads the separate, longer-lived `fute_refresh` cookie) to get a new access token, then retries the original request — the user never notices the access token expired at all.

---

## 3. The Firestore-shaped shim over MongoDB

**WHAT.** `config/db.js` is a hand-written module that makes the native `mongodb` npm driver *look and behave* like the Firestore Admin SDK (`collection().doc().get()`, `.where().orderBy().limit()`, `batch()`, `runTransaction()`), even though there is no Firestore anywhere in this stack anymore.

**WHY.** Straight from the file's own header comment:
> "The app was written against the Firestore Admin SDK's call shape... this module reproduces just enough of that surface that controllers keep working after swapping the import from `./config/firebase` to `./config/db`, instead of rewriting ~170 call sites across the app."

This is a real engineering tradeoff: rewriting every controller to use native MongoDB syntax (`collection.findOne({_id})` instead of `collection.doc(id).get()`) would touch dozens of files and risk introducing new bugs in code that already worked. Instead, one file absorbs all the translation.

**HOW.** Take `db.collection('users').doc(uid).get()` (used constantly, e.g. in `authMiddleware.js`):
```js
function makeDocRef(collectionName, id) {
  return {
    id, collectionName,
    async get(opts = {}) {
      const c = await col(collectionName);
      const doc = await c.findOne({ _id: id }, { session: opts.session });
      return { exists: !!doc, id, ref: makeDocRef(collectionName, id), data: () => stripId(doc) };
    },
    ...
  };
}
```
Under the hood it's a plain `findOne({_id: id})` — but it's wrapped to return an object shaped like a Firestore `DocumentSnapshot` (`.exists`, `.data()`), so calling code never has to know the difference. `where()`/`orderBy()`/`limit()` chains get built up as plain state and translated into a real Mongo filter + sort object only when `.get()` is finally called (see `buildQuery()` in the same file).

**WHERE.** Every single controller imports `{ db }` from `../config/db` and never touches the `mongodb` package directly.

**WHEN.** On every read/write in the app — there is no code path that bypasses this shim to talk to MongoDB directly.

**WHAT-IF** this had been a straight rewrite to a real MongoDB ODM (e.g. Mongoose) instead of a shim? *(Reasoned inference, not stated anywhere in the code — marked as such.)* Pros: native Mongo idioms, schema validation built in, likely better long-term maintainability for new hires who don't know Firestore's API. Cons: the ~170-call-site rewrite the shim's own comment says it was built to avoid, a real risk of subtly changing behavior (e.g. Firestore's `orderBy()` silently drops documents missing the sort field — several controllers, e.g. `utils/pagination.js`, explicitly work around this quirk, so a naive Mongoose rewrite could accidentally "fix" that behavior and break code that (perhaps unintentionally) depends on it), and a bigger, riskier single change instead of an isolated, reviewable one. The shim's real cost is that a future maintainer has to learn *this project's specific* translation layer instead of a well-documented public library.

---

## 4. CSRF double-submit cookie protection

**WHAT.** CSRF (Cross-Site Request Forgery) is when a malicious page, opened in a browser that has an active session with your app, tricks the browser into sending a request to your app (e.g. `<form action="https://fute.example/api/hr/complaints/123" method="DELETE">`) — the browser automatically attaches the session cookie, and the server can't tell the request wasn't initiated by the real user.

**WHY it's needed here specifically.** `middleware/csrfMiddleware.js`'s own comment explains the trigger:
> "Session auth just switched from a JS-attached Authorization header (immune to CSRF...) to a cookie. Because the frontend and backend are on separate origins, the cookie has to be `SameSite=None` to be sent at all, which also means it's sent on cross-site requests — exactly what SameSite normally exists to prevent."

In other words: moving the access token into an `httpOnly` cookie fixed one problem (XSS can't read the token) but reopened another (CSRF), because a cross-origin `SameSite=None` cookie is sent on *any* request to that domain, forged or not.

**HOW — double-submit in this codebase:**
1. On login (`authController.js`), the server sets **two** cookies: the `httpOnly` session cookie (unreadable by JS) and a *separate*, non-`httpOnly` CSRF cookie (`utils/cookies.js`'s `setCsrfCookie` — a random 24-byte hex value).
2. The frontend reads that CSRF cookie's value with `document.cookie` (see `main/frontend/src/utils/api.js`) and sends it back as a request header, `X-CSRF-Token` (and as a body fallback `_csrf`, for browser extensions that strip custom headers).
3. `csrfMiddleware.js` checks that the cookie value and the header value **match**:
```js
const cookieToken = req.cookies?.[CSRF_COOKIE];
const headerToken = req.headers['x-csrf-token'] || req.body?._csrf;
if (!cookieToken || !headerToken || cookieToken !== headerToken) {
  return fail(res, { status: 403, message: 'CSRF token missing or invalid', code: 'CSRF_INVALID' });
}
```

**WHAT-IF an attacker's page tries to forge a request?** The attacker's page can make the victim's browser *send* the CSRF cookie (cookies are sent automatically to their own domain, forged request or not) — but same-origin policy means the attacker's JavaScript, running on `evil.example`, **cannot read** the value of a cookie that belongs to `fute.example`. So it has no way to put the correct value into the `X-CSRF-Token` header. Its forged request either has no header at all, or a guessed/wrong one — either way, `cookieToken !== headerToken` and `csrfMiddleware` rejects it with a 403.

**WHERE / WHEN.** Applied globally in `server.js` (`app.use(csrfMiddleware)`), but only actually enforced on mutating requests — `SAFE_METHODS` (`GET`, `HEAD`, `OPTIONS`) and a short `EXEMPT_PATHS` list (`/api/auth/login`, `/register`, `/refresh` — explained in the file's own comments as "nothing here yet worth protecting, or the credential IS the CSRF-equivalent already") skip the check.

---

## 5. Roles vs. permissions (three layers of authorization)

**WHAT.** This app checks "is this user allowed to do X" at three different layers, each answering a different question.

**Layer 1 — coarse role gate (`middleware/roleMiddleware.js`).** "Is this user's *role* even in the right department for this route family at all?"
```js
function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return fail(res, { status: 403, message: 'Access denied', code: 'FORBIDDEN' });
    }
    next();
  };
}
```
Used like `router.get('/complaints', auth, role('hr', 'founder'), getAllComplaints)` — an `it` or `employee` user is rejected before the controller ever runs.

**Layer 2 — granular action permission (`middleware/permissionMiddleware.js`).** "Within a role that's *generally* allowed here, is this specific role allowed to do this specific action on this specific resource *today*?" This reads a Super-Admin-editable matrix (`settings/action_permissions`) — e.g. IT might be allowed to `create` assets but not `delete` them, and that can change without a code deploy:
```js
router.delete('/assets/:id', auth, role('it', 'founder'), requirePermission('assets', 'delete'), deleteAsset);
```

**Layer 3 — ownership/business-rule checks inside the controller.** "Even though this role generally has access, does *this specific record* belong to *this specific user*?" E.g. `controllers/complaintControllerFactory.js`'s `deleteComplaint`:
```js
if (doc.data().user_id !== req.user?.id) {
  return fail(res, { status: 403, message: 'Forbidden: you can only delete your own ticket', code: 'FORBIDDEN' });
}
```
No middleware could express this — it depends on data that's only known after the specific document is loaded.

**WHY three layers instead of one.** Each layer answers a question the others structurally cannot: role membership is static and route-wide (cheap, checked before touching the database at all); the action-permission matrix is dynamic and Super-Admin-configurable without a redeploy but still resource/action-shaped, not row-shaped; ownership is inherently per-row and can only be evaluated once that row is loaded. Collapsing them into one check would either force every route to load a full document just to check role membership (wasteful) or hardcode ownership rules into a static permissions table (impossible — ownership is data, not config).

**WHERE.** `middleware/roleMiddleware.js`, `middleware/permissionMiddleware.js`, and ownership checks scattered through individual controllers (`complaintControllerFactory.js`, `taskProjectController.js`'s `updateTaskStatus`, `chatController.js`'s `canAccessChannel`, etc.).

**WHEN.** Layer 1 always runs first (it's listed first in the route). Layer 2 runs next, only on routes that declare it (only IT asset writes use it in this codebase). Layer 3 runs last, inside the controller, only after the relevant document has been fetched.

**WHAT-IF** a role check and an ownership check disagree? They don't get to disagree — they're ANDed. A `founder` passes the role gate on `deleteComplaint` too (well — `deleteComplaint` actually has *no* role middleware at all; it relies purely on layer 3's ownership check, which is stricter than any role: only the exact submitter can delete, not even `hr`/`founder`). This is a case worth knowing about explicitly: some routes skip layer 1 entirely and rely only on layer 3.
