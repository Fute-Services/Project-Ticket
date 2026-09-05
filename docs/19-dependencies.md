# 19 — Dependencies

Teacher's summary: a `package.json` dependency is a piece of someone else's code the project relies on instead of writing itself. This backend keeps its dependency list small and boring on purpose — every one of the twelve production packages below earns its place with a specific, real use in the code.

## Production dependencies (`dependencies` in `package.json`)

| Package | Version | Purpose | Where used |
|---|---|---|---|
| `bcryptjs` | `^2.4.3` | Password hashing (`bcrypt.hash`/`bcrypt.compare`) | `config/db.js`'s `auth` object — `createUser`, `updateUser`, `verifyPassword` |
| `cookie-parser` | `^1.4.7` | Parses the `Cookie` request header into `req.cookies` | `server.js` (`app.use(cookieParser())`) — every cookie read in `authMiddleware.js`, `csrfMiddleware.js`, `authController.js` depends on this |
| `cors` | `^2.8.5` | Cross-Origin Resource Sharing middleware | `server.js` — the origin allow-list + `credentials: true` config described in [15-security.md](15-security.md) |
| `dotenv` | `^16.3.1` | Loads `.env` file contents into `process.env` | Required at the top of `server.js`, `config/db.js`, `utils/jwt.js`, `utils/mailer.js`, `controllers/authController.js` |
| `exceljs` | `^4.4.0` | Reads/writes `.xlsx` spreadsheet files | `controllers/salesDeskController.js` — parsing the lead-import workbook (`ExcelJS.Workbook`) |
| `express` | `^4.18.2` | The HTTP web framework itself | Everywhere — `server.js`, every file under `routes/` |
| `express-async-errors` | `^3.1.1` | Patches Express 4 so a rejected promise inside an `async` route handler reaches the error middleware automatically | Required once in `server.js`, before any route — see [14-error-handling.md](14-error-handling.md) |
| `express-rate-limit` | `^8.6.2` | Per-window request throttling | `server.js` (global limiter), `routes/authRoutes.js` (`authLimiter`), `routes/founderRoutes.js` (`expensiveReadLimiter`) |
| `helmet` | `^8.3.0` | Sets a batch of security-related HTTP response headers | `server.js` (`app.use(helmet())`) — see [15-security.md](15-security.md) |
| `jsonwebtoken` | `^9.0.2` | Signs and verifies JWTs | `utils/jwt.js` |
| `maildev` | `^2.1.0` | A local, no-auth SMTP capture server for development | Not imported by app code directly — it's a standalone dev tool the project depends on being installed/runnable, used as the default target of `utils/mailer.js`'s SMTP config. Notably listed under `dependencies`, not `devDependencies`, which is unusual for what is fundamentally a dev-only tool — worth a cleanup note, not a functional problem. |
| `mongodb` | `^6.10.0` | The official MongoDB Node.js driver | `config/db.js` — every actual database read/write goes through this |
| `multer` | `^2.2.0` | Parses `multipart/form-data` file uploads | `utils/upload.js` (`upload`, `uploadSpreadsheet`) |
| `nodemailer` | `^9.0.6` | Sends email over SMTP | `utils/mailer.js` |

## Dev dependency

| Package | Version | Purpose |
|---|---|---|
| `nodemon` | `^3.0.2` | Restarts the server automatically on file changes — used only by the `"dev": "nodemon server.js"` script, never in production (`"start": "node server.js"` uses plain Node). |

## The `overrides` block

```json
"overrides": {
  "jose": "^4.15.9",
  "qs": "^6.16.0",
  "maildev": { "nodemailer": "^9.1.1" }
}
```

`package.json` carries no comment explaining this, so the following is **inferred**, not confirmed from any code comment: `overrides` forces a specific version of a *transitive* dependency (a package one of the listed dependencies pulls in, not one this project imports directly) regardless of what the parent package's own `package.json` requests. Pinning `jose` and `qs` to specific minimum versions, and forcing `maildev`'s own internal `nodemailer` to a newer version than `maildev` itself would otherwise install, is a pattern typically used to close a known vulnerability in an older transitive version without waiting for the parent package to update its own dependency range. Treat this as a security/supply-chain hygiene measure — not a functional change to app behavior.

## No test framework

There is no `jest`, `mocha`, `vitest`, `supertest`, or any other test runner in either `dependencies` or `devDependencies`, and no `"test"` script in `package.json`. See [21-testing.md](21-testing.md) for the full implication of that.
