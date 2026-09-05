# API Security — New Findings Only

Full live-tested results (auth bypass, CSRF bypass, role-check bypass, IDOR probes, validation checks, rate limiting) are in `docs/testing/SECURITY_TEST_RESULTS.md` and `docs/testing/API_TEST_RESULTS.md` — **not repeated here**. Per the task constraint, no new authenticated probes were run against `/login`-adjacent routes in this pass. This file covers only what those docs don't: debug/internal endpoint discovery and a source-level (not live) check of admin route authorization wiring.

## Debug/internal endpoint discovery (new — not covered by prior live testing)

Grepped `main/backend/routes/*.js` and `server.js` for any `/debug`, `/internal`, `/test`, `/dev`-style path. **None found.** The complete unauthenticated surface is:

- `GET /` — static `{"message":"Fute Portal API running"}`, no data.
- `GET /healthz` — `{"mongo":"reachable","pingMs":<n>}` on success, generic `503` on failure (driver error detail logged server-side only, never returned — see `PRODUCTION_HARDENING.md`).

Both were live-curled in this pass (no login required, no rate-limit impact) and returned exactly the documented shape — see `SECURITY_HEADERS.md` for the full response bodies/headers. No stray debug router, no leftover Firebase-migration test route, no admin backdoor endpoint exists.

## Admin endpoint authorization — source-level confirmation (not re-tested live)

`docs/testing/SECURITY_TEST_RESULTS.md` already live-tested 14 role-bypass probes across HR/IT/sales/founder/superadmin routes and found zero bypasses, including confirming `founder` cannot reach `superadmin`-only routes. This pass adds a source-level read (no new HTTP calls) to confirm the code backing those results is what it appears to be, not a coincidence of test data:

- `main/backend/routes/founderRoutes.js`: `/api/founder/users*` (superadmin user management) and equivalent routes are wired `router.<verb>('/users...', auth, role('superadmin'), <handler>)` — the gate is a real middleware call in the route chain.
- `main/backend/routes/securityRoutes.js`: every route (unlock account, revoke session, force-logout, failed-logins list) is `auth, role('superadmin')` — matches `docs/08-authorization.md`'s table exactly, no route left ungated.
- `main/backend/middleware/permissionMiddleware.js`'s `requirePermission()` short-circuits `true` for `role === 'superadmin'` before consulting the configurable action matrix — confirms a superadmin's access can't be inadvertently narrowed by that layer, only by the coarse role layer (which, per `08-authorization.md`, nothing currently restricts for `superadmin`).

This is a code-path confirmation exercise, not new test coverage — it exists to answer "is the enforcement actually backend-side code, or could it be a coincidence of what was tested" for anyone reading this audit without re-running the live probes.

## Response shape / field exposure

Reviewed against `docs/testing/API_TEST_RESULTS.md`'s sampled response bodies — see `DATA_EXPOSURE_AUDIT.md` §5 for the full cross-check (no password hash, no raw internal file path, no `_auth_credentials` fields found in any sampled response).

## Dependency-level API risk

One moderate, unrelated-to-request-handling dependency finding surfaced from a live `npm audit` run in this pass — `exceljs`'s transitive `uuid` dependency (used by the `POST /api/sales-desk/leads/import` spreadsheet-parsing endpoint). See `VULNERABILITIES_FOUND.md` VULN-06 for detail; not a request-handling/authorization gap, a supply-chain one.
