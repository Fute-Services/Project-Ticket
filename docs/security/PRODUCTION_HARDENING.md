# Production Hardening — Source Maps, Error Handling, Debug Endpoints, Logging

No code changed to produce this document.

## 1. Source maps

`main/frontend/vite.config.js` sets no `build.sourcemap` option at all. Vite's own default for that option is `false` — so the current config produces a production build **without** source maps unless a future change explicitly turns it on. Confirmed empirically: `main/frontend/dist/` (an existing build in the repo) contains zero `.map` files across all 70 files under `dist/assets/`. No action needed today; this is a "config is already correct" finding, worth documenting so nobody accidentally sets `sourcemap: true` for production without realizing it publishes the entire original source tree (component logic, comments, the Gemini system prompt string, etc.) to any visitor's DevTools.

## 2. `NODE_ENV` branching in error handling

Grepped all of `main/backend` application code (excluding `node_modules`) for `NODE_ENV` — **zero matches**. The backend does not branch on `NODE_ENV` anywhere. This initially reads as a gap ("is verbose error output left on in production?") but per `docs/14-error-handling.md`, the actual design doesn't need the branch: `middleware/errorMiddleware.js` **always** sends a generic `'Internal server error'` string for any error without an explicit `.status` (i.e. any unexpected/unhandled exception), in every environment, and always logs the real error server-side via `console.error(err)`. So there is no "production vs dev" mode where stack traces leak — the safe behavior is unconditional, not environment-gated. This is a strength, not a weakness, but it does mean local development also never sees a helpful stack trace in the HTTP response (only in the terminal), which is a minor DX tradeoff, not a security issue.

Verified live: a 404 (`GET /api/nonexistent-route-xyz`) and a CORS rejection both returned clean, generic JSON bodies with no path/stack/internal detail:
```json
{"success":false,"message":"Not found","error":{"code":"NOT_FOUND","details":null}}
{"success":false,"message":"Not allowed by CORS","error":{"code":"CORS_NOT_ALLOWED","details":null}}
```

## 3. Debug/internal endpoints

Grepped every file in `main/backend/routes/` and `server.js` for `/debug`, `/internal`, `/test`, `/dev` path patterns — no matches. The only two unauthenticated routes in the entire app are:

| Route | Exposes |
|---|---|
| `GET /` | `{"message":"Fute Portal API running"}` — a static string, nothing else |
| `GET /healthz` | `{"mongo":"reachable","pingMs":<n>}` on success, or a generic `503 SERVICE_UNAVAILABLE` with no driver detail on failure (per `server.js`'s explicit try/catch, see `docs/14-error-handling.md`) |

Both are minimal, intentional, and match standard uptime-check conventions. No stray debug router, no admin backdoor route, no leftover test endpoint was found.

## 4. Logging hygiene

Grepped every `console.log`/`console.error`/`console.warn` call across `main/backend` (excluding `node_modules`) — 12 call sites total, all in `server.js`, `middleware/errorMiddleware.js`, `controllers/complaintControllerFactory.js`, `controllers/approvalController.js`, and `controllers/hrDeskController.js`. Every one of them logs either:
- a static string (`'Server running on port...'`, `'Server closed.'`),
- an error's `.message` only (`console.error('Mail error:', e.message)`, `console.error('Failed to notify founder:', e.message)`), or
- the full caught `Error` object in the one global funnel (`errorMiddleware.js`'s `console.error(err)`), which is server-side-only output (never reflected to the client, per §2 above).

**No call logs a password, a token (JWT, refresh, or CSRF), or a full request body.** This is a clean result — worth stating plainly rather than searching for a problem that isn't there.

## 5. Admin endpoint authorization — code-level verification (not re-tested live)

Per the task's rate-limit constraint, this was verified by reading the middleware chain rather than making new authenticated calls (today's live role-bypass probes in `docs/testing/SECURITY_TEST_RESULTS.md` already covered this at the HTTP level and found no bypass). Confirmed in source:

- `routes/founderRoutes.js`: every `/api/founder/users*` route and the `superadmin`-only ones the security tests exercised are wired `auth, role('superadmin'), <handler>` — the role gate is a real Express middleware in the chain, not a comment or a TODO.
- `routes/securityRoutes.js`: every route (`unlockAccount`, `revokeSession`, `forceLogoutUser`, `failed-logins`) is `auth, role('superadmin')` — matches `docs/08-authorization.md`'s table exactly.
- `middleware/permissionMiddleware.js`'s `requirePermission()` always lets `req.user.role === 'superadmin'` through unconditionally before consulting the configurable matrix — i.e. a Super Admin can never accidentally lock themselves out of the fine-grained layer, only out of the coarse role layer (which nothing currently restricts for that role).

This is a source-code confirmation that the authorization code path documented in `docs/08-authorization.md` genuinely exists and is wired into the route tables — not a new live test.
