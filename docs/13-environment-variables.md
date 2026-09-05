# 13 — Environment Variables

Teacher's summary: an environment variable is a setting the app reads from the operating system at startup instead of hard-coding it — so the same code can run against a local MongoDB in development and a different one in production without editing a single line. This file lists every variable the backend actually reads with `process.env`, nothing more, nothing assumed.

## Variables actually read in code

| Variable | Read in | Required? | Default if unset | Purpose |
|---|---|---|---|---|
| `JWT_SECRET` | `utils/jwt.js` (`signAccessToken`/`verifyAccessToken`), also checked directly in `server.js` | **Required** | none — see below | Secret key used to sign/verify access-token JWTs. |
| `MONGODB_URL` | `config/db.js` | Optional | `'mongodb://127.0.0.1:27017'` | Connection string for the MongoDB server. |
| `MONGODB_DB_NAME` | `config/db.js` | Optional | `'fute_portal'` | Which database on that MongoDB server to use. |
| `PORT` | `server.js` | Optional | `5000` | TCP port the Express app listens on (only when not running under Vercel — see `VERCEL` below). |
| `SMTP_HOST` | `utils/mailer.js` | Optional (but effectively needed for mail to work) | `undefined` → nodemailer will fail to connect | Mail transport host. `.env.example` sets this to `localhost` for the local maildev capture server. |
| `SMTP_PORT` | `utils/mailer.js` | Optional | `undefined` → `parseInt(undefined)` is `NaN`, which will make nodemailer fail | Mail transport port (`.env.example`: `1025`). |
| `SMTP_USER` | `utils/mailer.js` | Optional | none | If set, added to the transporter's `auth` block — used to point mail at a real authenticated relay instead of maildev. Also used as the mail "from" address fallback (`MAIL_FROM`). |
| `SMTP_PASS` | `utils/mailer.js` | Optional | none | Password paired with `SMTP_USER`. |
| `HR_EMAIL` | `controllers/complaintControllerFactory.js`, read dynamically as `process.env[opts.notifyEmailEnvVar]` when `opts.notifyEmailEnvVar === 'HR_EMAIL'` (i.e. the HR complaint controller) | Optional | none (falls back to whatever `recipientEmail` is configured in `notification_rules`, or `undefined`) | Default recipient for "new HR complaint" notification email. |
| `IT_EMAIL` | Same mechanism, for the IT complaint controller | Optional | none | Default recipient for "new IT complaint" notification email. |
| `FRONTEND_URL` | `server.js` (CORS `allowedOrigins` list) | Optional | `undefined` (filtered out of the allow-list via `.filter(Boolean)`) | The deployed frontend's origin, added to the CORS allow-list so it can call the API cross-origin with cookies. Any `http://localhost:<port>` is always allowed regardless of this variable (see `isLocalhost()` in `server.js`). |
| `VERCEL` | `server.js`, `utils/cookies.js` | Not user-set — injected automatically by the Vercel platform in every deployed environment | unset locally | Used as a boolean flag: (1) `server.js` skips its own `app.listen()`/graceful-shutdown code when running under Vercel (Vercel manages the process itself), and (2) `utils/cookies.js` uses it to decide whether cookies need `Secure`/`SameSite=None` (deployed, cross-origin, HTTPS) vs `Lax`/non-Secure (local `http://localhost`). |

### `JWT_SECRET` fail-fast behavior

`server.js` checks this **before** anything else loads:

```js
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}
```

The comment in the code explains why: without this check, a missing `JWT_SECRET` used to let the server start successfully and only fail the first time someone tried to log in (`jwt.sign` throwing inside the request handler) — turning a configuration mistake into a production incident instead of a failed deploy. Now it's a hard refusal to boot at all.

## Legacy / dead variables (present in `.env`, read by nothing)

The actual `.env` file on disk (not `.env.example`) still contains four variables left over from before the Firebase → MongoDB migration:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_API_KEY`

None of these are read anywhere in the current `main/backend` source (confirmed by grep across `config/`, `controllers/`, `middleware/`, `routes/`, `utils/`, and `server.js` — only `MONGODB_URL`, `MONGODB_DB_NAME`, `JWT_SECRET`, `PORT`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FRONTEND_URL`, and `VERCEL` show up). They're inert — safe to remove, but harmless to leave, since nothing in the app looks for them. Do not treat them as "real" configuration for this codebase; they're a migration artifact.

`.env.local` on disk contains only `VERCEL_OIDC_TOKEN`, created automatically by the Vercel CLI — not read by any application code either.

## Secrets

No real secret values are reproduced anywhere in this documentation set. Wherever a secret would appear in an example, it is written as `<SECRET>`. `.env.example` (checked into the repo) ships only placeholder values (e.g. `JWT_SECRET=your_jwt_secret_key`) — never a real key.
