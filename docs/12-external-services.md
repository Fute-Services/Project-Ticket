# 12 — External Services

Teacher's summary: this backend talks to almost nothing outside itself. There is no cloud storage, no payment gateway, no SMS provider, no analytics SDK, no third-party REST API call anywhere in `main/backend`. The only two things it depends on beyond its own process are a database and a mail transport, and both are self-hosted.

## 1. MongoDB — the persistence layer

Not an "external service" in the cloud-vendor sense (no API keys, no billing, no network hop to a different company) — it's a self-hosted MongoDB instance the backend connects to over `MONGODB_URL`. See `config/db.js` and [06-database.md](06-database.md) for the full shim/collection design. Mentioned here only for completeness, since it is technically a separate process the Node app depends on.

## 2. SMTP mail — `utils/mailer.js`

The backend sends email through [nodemailer](https://nodemailer.com/), configured in `utils/mailer.js`:

```js
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } } : {}),
});
```

By default (`.env.example`), this points at:

```
SMTP_HOST=localhost
SMTP_PORT=1025
```

That's **maildev** — a local, no-auth SMTP *capture* server bundled straight into `package.json`'s `dependencies` (not `devDependencies`, which is a little unusual — see [19-dependencies.md](19-dependencies.md)). maildev doesn't deliver real email to real inboxes; it accepts SMTP traffic on port 1025 and shows you what was "sent" in a local web UI (typically port 1080). It exists so the app can exercise its real mail-sending code paths in development/self-hosted testing without needing a real mail provider account.

If `SMTP_USER`/`SMTP_PASS` are ever set, the transporter adds an `auth` block and `mailer.js`'s comment says this is exactly how you'd point it at a **real** relay instead (e.g. a real SMTP provider) — but no such relay is configured in the code or `.env.example` today. `MAIL_FROM` defaults to `SMTP_USER` or falls back to the literal string `"noreply@fute-portal.local"`.

Who calls `sendMail()`:
- `controllers/complaintControllerFactory.js` — new-complaint and status-update notifications (HR/IT desks)
- `controllers/approvalController.js` — `notifyFounder()` on approval decisions and remarks
- `controllers/hrDeskController.js` — `notifyFounder()` on document uploads and extra-hours submissions, plus `sendEmail()` for HR's own outgoing mail (Sent folder feature)

All HTML bodies pass user-supplied strings through `escapeHtml()` (also in `utils/mailer.js`) before interpolating them into markup — see [15-security.md](15-security.md) for why.

## 3. Nothing else

Explicitly, based on reading every controller/middleware/util file in `main/backend`:

| Category | Present? |
|---|---|
| Cloud object storage (S3, Firebase Storage, Azure Blob, etc.) | **No.** Uploads are written to local disk — see [16-file-storage.md](16-file-storage.md). |
| Payment gateway (Stripe, Razorpay, etc.) | **No.** |
| SMS / push notification provider | **No.** |
| Third-party analytics (Segment, Mixpanel, GA server-side, etc.) | **No.** The `/api/founder/analytics` endpoints are 100% first-party, computed from the app's own MongoDB collections (`controllers/analyticsController.js`). |
| Error tracking / APM (Sentry, Datadog, New Relic) | **No.** See [18-logging-monitoring.md](18-logging-monitoring.md). |
| OAuth / social login providers | **No.** Auth is email+password only — see [07-authentication.md](07-authentication.md). |
| Any other outbound HTTP call to a third-party API | **No.** Nothing in `main/backend` imports `axios`, `node-fetch`, or the native `fetch` to call an external API (the `node-fetch` package present in `node_modules` is a transitive dependency of something else, not used directly by app code). |

If any of these are added later, this file should be the first thing updated.
