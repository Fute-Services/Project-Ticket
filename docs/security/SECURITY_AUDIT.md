# Security Audit — Overview

Documentation-only pass, 2026-09-05. **No code was fixed, patched, refactored, or otherwise modified to produce any file in `docs/security/`.** This overview ties together the frontend audit, live header/CORS checks, and error-handling review; see the sibling files for full detail on each area, and see `README.md` in this folder for the full index and severity totals.

## What this pass covers vs. what it reuses

Two other agents already ran extensive live login-based security testing today (`docs/testing/SECURITY_TEST_RESULTS.md`, `docs/testing/API_TEST_RESULTS.md`, `docs/testing/BUGS_FOUND.md`) and exhausted the shared `authLimiter` (10 req/15min/IP on `/login`, `/register`, `/refresh`, `/verify-password`) more than once. This pass **reused those results rather than re-deriving them** and made only unauthenticated, non-rate-limited live requests of its own: `curl -I` against the backend root/`healthz`/a 404/a CORS preflight, and against the frontend static host — none of which touch `authLimiter`. No login was performed in this pass. A local `npm audit` (dependency-tree check, no network request to the app at all) was also run.

## Frontend audit summary (full detail: `DATA_EXPOSURE_AUDIT.md`)

- The only `VITE_`-prefixed env var (`VITE_API_BASE_URL`) is a public URL, not a secret — no server-only value leaks via a `VITE_` prefix.
- No hardcoded backend/third-party secret found in `main/frontend/src`.
- One real exposure: the Founder AI Advisor feature stores a user-supplied Gemini API key in `localStorage` and sends it as a URL query parameter directly from the browser to Google's API (VULN-03 — Low, it's a BYOK key, not an application secret).
- The built `dist/` contains zero source maps (Vite's default with no override — see `PRODUCTION_HARDENING.md`).
- Every frontend role-based UI gate sampled (admin panels, delete buttons, approval-decide buttons) has a corresponding backend-enforced check per `docs/08-authorization.md` — no frontend-only security boundary was found.

## Headers, CORS, error handling summary (full detail: `SECURITY_HEADERS.md`, `PRODUCTION_HARDENING.md`)

- The backend (`helmet()` default) actually ships a solid header baseline live — CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` — confirmed via `curl -i`, which is a stronger result than `docs/15-security.md`'s "default configuration only" phrasing might suggest at first read (see `SECURITY_HEADERS.md` for the correction/nuance).
- The frontend's self-hosted static copy (`http://192.168.1.23`, port 80) ships **none** of those headers — VULN-01 (Medium), and the one genuinely new, actionable finding of this pass.
- HSTS is currently sent over plain HTTP (the backend isn't behind TLS yet per `docs/20-deployment.md`), so it's inert today — VULN-04 (Low, informational).
- CORS behaves exactly as `docs/15-security.md` documents: a disallowed origin gets `403 CORS_NOT_ALLOWED`, an allow-listed origin gets a correctly-reflected (non-wildcard) `Access-Control-Allow-Origin` plus `Access-Control-Allow-Credentials: true`. No drift between code and live behavior found.
- The error-handling design (`middleware/errorMiddleware.js`) never leaks stack traces or internal detail regardless of environment — there's no `NODE_ENV` branch at all because the safe behavior is unconditional. Confirmed live on a 404 and a CORS rejection.

## Other areas covered

- **Debug/internal endpoints:** none found; the only unauthenticated routes are `GET /` and `GET /healthz`, both minimal (`API_SECURITY.md`, `PRODUCTION_HARDENING.md`).
- **File uploads:** MIME allow-list + size caps + path-containment checks are real and match `docs/16-file-storage.md`, but validation trusts the client-supplied `Content-Type` with no magic-byte or extension cross-check — VULN-02 (Medium).
- **Logging:** all 12 `console.log`/`console.error` call sites in `main/backend` were read; none logs a password, token, or full request body — clean result, no vulnerability.
- **Admin authorization:** source-level confirmation that every `superadmin`-only route is genuinely gated by `role('superadmin')` middleware in the route chain, not just documented — matches `docs/08-authorization.md` exactly (`API_SECURITY.md`).
- **Dependencies:** a live `npm audit` found one moderate, unrelated-to-auth transitive vulnerability (`exceljs` → `uuid`, VULN-06 — Medium) not previously documented in `docs/19-dependencies.md`.

## Total new issues this pass

**0 Critical, 0 High, 3 Medium, 3 Low** — see `VULNERABILITIES_FOUND.md` for the full write-up of each with attack scenario, current behavior, fix, and verification steps.
