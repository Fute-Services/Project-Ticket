# Vulnerabilities Found — This Audit Pass

Scope: new findings from the frontend/build/header/error-handling/upload/logging audit described in `SECURITY_AUDIT.md`. Findings already documented and live-tested in `docs/15-security.md`, `docs/testing/SECURITY_TEST_RESULTS.md`, and `docs/testing/BUGS_FOUND.md` are **not repeated here** — see those files for the fixed rate-limit bug (BUG-01) and the confirmed-clean auth/CSRF/IDOR/role probes. No code was modified to produce this document.

Total: **0 Critical, 0 High, 3 Medium, 3 Low**. All 3 Medium issues (VULN-01, VULN-02, VULN-06) were fixed 2026-09-05 — see each entry's Status line. The 3 Low items remain open (informational/design tradeoffs, not urgent).

---

## VULN-01: Frontend static host serves zero security headers

- **Status:** ✅ Fixed 2026-09-05 — added `preview.headers` (CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) to `main/frontend/vite.config.js`, since `vite preview` is the mechanism used to serve the built frontend. Verified live: `curl -I http://localhost:4173` after `vite preview` now returns all four headers. Caveat: this only takes effect if the office server actually runs `vite preview` to serve port 80 — if it turns out to be a different static host (IIS, etc.), that layer still needs its own header config.
- **Severity:** Medium
- **Location:** Whatever serves `main/frontend/dist/` on `http://192.168.1.23` (port 80) — not application code in this repo; it's the static-hosting layer (config for it was not found under `main/backend` or `main/frontend`).
- **Why it matters:** The backend (`server.js`, `app.use(helmet())`) gets a strong header baseline (CSP, `X-Frame-Options`, `X-Content-Type-Options`, HSTS, etc. — see `SECURITY_HEADERS.md`). The frontend, which is what a user's browser actually renders and where any injected script would execute, gets none of that on this self-hosted copy.
- **Attack scenario:** If any injection vector into the rendered page were ever found (e.g. a stored-XSS bug in a field that gets rendered unescaped somewhere), the absence of a CSP on the page that serves the app removes a layer of defense-in-depth that would otherwise constrain what an injected script could do (inline script execution, framing, etc.). Absence of `X-Frame-Options`/`frame-ancestors` also means this copy of the frontend could be embedded in a clickjacking iframe on another site.
- **Current behavior:** `curl -i http://192.168.1.23/` returns only `Content-Type`, `ETag`, `Accept-Ranges`, `Vary` — no `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, or `Strict-Transport-Security`.
- **Recommended fix:** Configure the static server/reverse proxy in front of `192.168.1.23:80` to add the same class of headers Helmet provides the API (a CSP scoped to the SPA's real script/style/connect/font sources, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` or `frame-ancestors 'self'`, `Referrer-Policy: no-referrer` or `same-origin`). This is an infrastructure/hosting config change, not an application code change — no file in `main/frontend` controls response headers for a static build served this way.
- **Verification:** `curl -I http://192.168.1.23/` and confirm the headers above are present.

---

## VULN-02: File upload validation relies solely on the client-supplied MIME type

- **Status:** ✅ Fixed 2026-09-05 — added a `validateFileSignature` middleware (`main/backend/utils/upload.js`) that checks the actual first bytes of `req.file.buffer` against the expected magic bytes for the declared MIME type, wired in after `upload.single('file')`/`uploadSpreadsheet.single('file')` on all three affected routes (`hrDeskRoutes.js` x2, `salesDeskRoutes.js` x1). Unit-verified: correctly formed PDF passes, HTML content mislabeled as `application/pdf` is rejected with `400 VALIDATION_ERROR`.
- **Severity:** Medium
- **Location:** `main/backend/utils/upload.js` (`fileFilter` on both `upload` and `uploadSpreadsheet`), used by `POST /api/hr-desk/employees/:id/documents/:docType`, `POST /api/hr-desk/document-templates`, `POST /api/sales-desk/leads/import`.
- **Why it matters:** `fileFilter` checks `file.mimetype`, which is the `Content-Type` the **client's browser/HTTP request** claims for the part — an attacker controls this value directly (e.g. via `curl -F "file=@payload.exe;type=application/pdf"`). There is no server-side content sniffing (magic-byte check), no file-extension allow-list, and no re-validation against the actual byte content of `req.file.buffer` before it's written to disk under `uploads/`. `docs/16-file-storage.md` documents the MIME allow-list and path-containment protections thoroughly but does not mention this gap.
- **Attack scenario:** An authenticated `hr`/`founder` user (this isn't reachable by an anonymous caller — the routes are behind `auth` + `role(...)`) could upload a file whose real content is arbitrary (e.g. an HTML file with an embedded script, or any executable byte stream) while declaring `Content-Type: application/pdf`. It would pass `fileFilter`, get written to `uploads/employee-documents/<id>/...`, and later be served back via `res.download()` with `originalFileName` from the client — `res.download()` does set `Content-Disposition: attachment`, which meaningfully limits (but does not eliminate on every browser/viewer) the risk of it being rendered inline as HTML/script rather than downloaded. The blast radius is narrowed by the fact this requires an authenticated `hr`/`founder`/`sales` session, not an open upload surface — the existing role gates in `08-authorization.md` and CSRF protection both still apply on the way in.
- **Current behavior:** `ALLOWED_MIME_TYPES`/`SPREADSHEET_MIME_TYPES` are `Set`s checked only against `file.mimetype`. No extension check on `req.file.originalname` (beyond the unrelated filename-sanitization regex in `hrDeskController.js`, which strips unsafe characters but doesn't validate the extension itself), no magic-byte/file-signature verification.
- **Recommended fix:** Add a lightweight content-sniffing check (e.g. verify the first bytes match the PDF/JPEG/DOCX/XLSX signature for the declared type) in addition to the MIME allow-list, and/or cross-check the file extension on `originalname` against the same allow-list before accepting the upload.
- **Verification:** Attempt an upload with a mismatched `Content-Type`/actual-content pair (e.g. a `.html` file declared as `application/pdf`) against a test HR account and confirm it is now rejected once a fix lands. Not exploited or attempted live in this pass (would require a real authenticated write against production data).

---

## VULN-03: Founder's third-party API key persisted in `localStorage` and transmitted via URL query string

- **Severity:** Low
- **Location:** `main/frontend/src/components/FounderAiAdvisorView.jsx` (state backed by `localStorage.getItem/setItem('fs_gemini_key', ...)`), `main/frontend/src/utils/aiCabinet.js`'s `callGeminiCabinet()` (`...generateContent?key=${encodeURIComponent(apiKey)}`).
- **Why it matters:** This is a "bring your own key" feature (the founder pastes a personal Google Gemini API key into a dashboard settings field to enable a live AI-advisor chat). The key is stored in `localStorage` (plaintext, JS-readable by anything running on that origin) and sent to Google as a URL query parameter rather than a header, both of which are conventionally discouraged patterns for credential-like values because they widen the set of places the value could end up logged or exposed (browser history, any request logging on a network intermediary, screen-recording/screen-share of the address bar during a request, etc.).
- **Attack scenario:** Requires either (a) an XSS bug on the frontend origin (none is known — this is the theoretical exposure a defense-in-depth reviewer would flag, not a demonstrated exploit), or (b) something on the network path logging full request URLs including query strings. Given the key is the founder's own, scoped to their own Google account/billing, the blast radius of a leak is Google API quota/billing abuse on that individual's key, not access to this application's own data.
- **Current behavior:** As described above — this is real, current behavior, not hypothetical.
- **Recommended fix:** If this feature is kept, consider routing the Gemini call through the backend (server holds the key server-side, e.g. as an env var, and the frontend only ever talks to the app's own API) so the key never reaches the browser at all — matching the pattern already used for every other credential in this app (JWT secret, SMTP credentials never sent client-side). If it must stay client-side (e.g. because it's intentionally a personal/BYOK key not meant to be shared with the backend operator), at minimum avoid the URL-query-param transport in favor of Google's documented header-based auth to reduce accidental logging exposure.
- **Verification:** Grep `main/frontend/src` for `fs_gemini_key`/`generativelanguage.googleapis.com` after a fix and confirm the key no longer appears in a URL and/or no longer persists client-side.

---

## VULN-04: `Strict-Transport-Security` header sent over a plain-HTTP backend is currently inert

- **Severity:** Low (informational-leaning — not exploitable, but worth tracking so it isn't mistaken for real protection)
- **Location:** `main/backend/server.js`'s `app.use(helmet())` default, live-confirmed via `curl -i http://192.168.1.23:5000/`.
- **Why it matters:** Browsers only honor `Strict-Transport-Security` on a response delivered over HTTPS; received over plain HTTP (which is how the backend is reached today per `docs/20-deployment.md`), it is silently ignored. This isn't harmful, but it means anyone reading response headers and concluding "HSTS is enforced" would be wrong today.
- **Attack scenario:** None directly — this is a false sense of security risk, not an exploitable gap by itself. It does mean the backend traffic itself is unencrypted plain HTTP today (already flagged as a deployment-topology question in `docs/20-deployment.md`, not a new finding here), so anything that *would* benefit from HSTS (protection against protocol-downgrade/SSL-stripping attacks) isn't actually protected yet.
- **Current behavior:** Header present, but inert given the current transport.
- **Recommended fix:** No code change needed — this header will start working automatically once the backend is served over HTTPS (e.g. a reverse proxy terminating TLS in front of `:5000`), which is an infrastructure change already tracked as an open question in `docs/20-deployment.md`.
- **Verification:** After TLS is added in front of the backend, re-curl over `https://` and confirm the browser actually upgrades subsequent requests (or just confirm the header now travels over a connection where it will be honored).

---

## VULN-06: Moderate transitive dependency vulnerability — `exceljs` → `uuid` buffer bounds check

- **Status:** ✅ Fixed 2026-09-05 — added `"uuid": "^11.1.1"` to the existing `overrides` block in `main/backend/package.json` (same mechanism already used for `jose`/`qs`). Verified: `npm audit --omit=dev` now reports 0 vulnerabilities, and `exceljs` still loads and creates workbooks correctly after the override.
- **Severity:** Medium
- **Location:** `main/backend/package.json` — `exceljs@^4.4.0` (direct dependency, used in `controllers/salesDeskController.js` for the sales-lead spreadsheet import) pulls in a vulnerable transitive `uuid` version.
- **Why it matters:** Confirmed via a fresh, live `npm audit --omit=dev` run against `main/backend` in this pass (a local dependency-tree check, not an HTTP request — doesn't touch the rate limit): 2 moderate advisories, both the same root cause. [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) — "uuid: Missing buffer bounds check in v3/v5/v6 when `buf` is provided" (CVSS 3.1: 7.5, `CWE-787`/`CWE-1285`, affects `uuid < 11.1.1`).
- **Attack scenario:** The advisory's actual trigger requires a caller to pass a pre-allocated `buf` argument into `uuid`'s v3/v5/v6 generation functions with insufficient remaining space, which is a caller-controlled API misuse pattern — `exceljs` uses `uuid` internally for its own purposes, and this codebase never calls `uuid` directly at all (confirmed: `uuid` isn't a direct dependency, only a transitive one). Practical exploitability from this app's actual usage (parsing an uploaded `.xlsx` via `ExcelJS.Workbook().xlsx.load()`) is Low — there's no evidence `exceljs` itself calls `uuid` with an attacker-influenced `buf` argument — but it's a real, currently-unpatched advisory sitting in the dependency tree, so it's logged here rather than dismissed.
- **Current behavior:** `npm audit`'s only available automatic fix is a **major** downgrade of `exceljs` to `3.4.0`, which `docs/19-dependencies.md` doesn't currently account for and which would need its own compatibility check against `salesDeskController.js`'s usage before applying.
- **Recommended fix:** Either wait for `exceljs` to publish a version that pulls a patched `uuid` (`>=11.1.1`) without a major bump, or add a `uuid` entry to the existing `overrides` block in `package.json` (the same mechanism already used for `jose`/`qs`, per `docs/19-dependencies.md`) forcing the transitive `uuid` resolution to `^11.1.1` without touching `exceljs`'s own version — this is very likely the lower-risk fix given the precedent already in this codebase.
- **Verification:** Run `npm audit --omit=dev` in `main/backend` after a fix and confirm `exceljs`/`uuid` no longer appear in the report.

---

## VULN-05: Misleading Firebase-era comment in `utils/upload.js`

- **Severity:** Low (code hygiene / risk of future mistake, not itself exploitable)
- **Location:** `main/backend/utils/upload.js`, comment above `const upload = multer({...})`: *"Memory storage: files are small... and go straight to Firebase Storage, never touch disk."*
- **Why it matters:** This is stale from the pre-migration (Firebase → MongoDB/local-disk) architecture described in `docs/13-environment-variables.md`'s "Legacy / dead variables" section. The actual code (`controllers/hrDeskController.js`) writes uploaded files to local disk under `uploads/`, not Firebase Storage — Firebase Storage isn't used anywhere in the current codebase. A future engineer trusting this comment could reasonably (and incorrectly) assume upload-security concerns are Firebase's problem rather than this app's own local-disk path-traversal/permission controls (documented in `docs/16-file-storage.md`), potentially skipping a needed review of `UPLOAD_ROOT` containment logic when touching this code.
- **Attack scenario:** Not directly exploitable — this is a documentation-drift risk, not a live gap. Flagged because it sits directly above security-relevant file-handling code.
- **Current behavior:** Comment is present and inaccurate; the actual storage behavior (local disk, `UPLOAD_ROOT` containment) is correct and already documented accurately in `docs/16-file-storage.md`.
- **Recommended fix:** Update the comment to reflect local-disk storage (or simply remove the outdated "Firebase Storage" clause) the next time this file is touched for any reason.
- **Verification:** Read the comment after a fix and confirm it matches `docs/16-file-storage.md`'s description of local-disk storage.
