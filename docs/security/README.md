# Security Audit Docs — Index

Documentation-only security audit, 2026-09-05. No code was fixed, patched, refactored, or otherwise modified anywhere in this repo to produce these files — findings only, for the user to triage and fix separately.

This audit deliberately **builds on**, rather than duplicates, same-day live testing already documented in `docs/15-security.md`, `docs/07-authentication.md`, `docs/08-authorization.md`, and `docs/testing/{SECURITY_TEST_RESULTS,BUGS_FOUND,API_TEST_RESULTS}.md`. Read those first for auth bypass/CSRF/IDOR/role-check live-test results and the design of every existing control. Everything below is either genuinely new ground (frontend source audit, header/CORS live checks, dependency audit) or a source-level confirmation of what the live tests already found.

## Files in this folder

| File | Covers |
|---|---|
| [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) | Overview tying together the frontend audit, header/CORS/error findings, and what was reused vs. newly tested. Start here. |
| [API_SECURITY.md](./API_SECURITY.md) | Debug/internal endpoint discovery (none found) and source-level admin-route authorization confirmation; defers to `docs/testing/` for live auth/CSRF/IDOR/role results. |
| [AUTH_SECURITY.md](./AUTH_SECURITY.md) | Auth/session findings not already in `docs/07-authentication.md` — cookie/deployment-topology risk, rate-limit bucket scoping confirmation, dependency check. |
| [DATA_EXPOSURE_AUDIT.md](./DATA_EXPOSURE_AUDIT.md) | Frontend secret/business-logic exposure audit, `VITE_` env var check, built-bundle contents, frontend-gate-vs-backend-enforcement cross-check, API response field exposure. |
| [SECURITY_HEADERS.md](./SECURITY_HEADERS.md) | Actual `curl -i` output for backend and frontend hosts vs. recommended headers, with real response headers reproduced in full. |
| [PRODUCTION_HARDENING.md](./PRODUCTION_HARDENING.md) | Source maps, `NODE_ENV`/error-leakage behavior, debug endpoints, logging hygiene. |
| [VULNERABILITIES_FOUND.md](./VULNERABILITIES_FOUND.md) | Every real issue found in this pass, one per entry: severity, location, why it matters, attack scenario, current behavior, fix, verification. |

## Total new issues found this pass, by severity

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 0 |
| Medium | 3 |
| Low | 3 |

**Medium:** frontend static host (`192.168.1.23`, port 80) ships no security headers (VULN-01); file upload validation trusts client-supplied MIME type only, no content/extension cross-check (VULN-02); moderate transitive dependency vulnerability, `exceljs` → `uuid` (VULN-06).

**Low:** Founder AI Advisor's Gemini API key persisted in `localStorage` and sent via URL query param (VULN-03); backend's HSTS header is currently inert over plain HTTP (VULN-04); a stale Firebase-era comment in `utils/upload.js` misdescribes current storage behavior (VULN-05).

No Critical or High severity issues were found in this pass. Combined with today's earlier live testing (which found zero auth/CSRF/role-check bypasses and one already-fixed rate-limit design issue), the application's core security controls — authentication, session management, CSRF, authorization layering, path-traversal protection, error-message hygiene — are in genuinely good shape. The issues above are real but narrow: one hosting-config gap, one defense-in-depth upload-validation gap, one BYOK client-side key-handling pattern, one inert-but-harmless header, one supply-chain patch, and one misleading comment.
