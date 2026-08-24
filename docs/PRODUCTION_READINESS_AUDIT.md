# Production Readiness Audit — Project-Ticket (Fute Portal)

**Scope:** `main/backend` (Express + Firestore) and `main/frontend` (React 18 SPA). **Date:** 2026-08-24. **Findings verified:** 24 (3 HIGH, 12 MEDIUM, 9 LOW; no CRITICAL findings surfaced).

---

## 1. Executive Summary

| Dimension | Rating |
|---|---|
| Architecture | NEEDS IMPROVEMENT |
| Security | NEEDS IMPROVEMENT |
| QA / Functional Correctness | NEEDS IMPROVEMENT |
| Performance | NEEDS IMPROVEMENT |
| Scalability | NEEDS IMPROVEMENT |
| **Overall Production Readiness** | **NOT READY** |

The app has a coherent, defensible baseline architecture — layered auth (JWT + role middleware + a separate permission matrix), per-context data fetching, and route-level RBAC applied consistently across the API surface. Nothing here is "broken." But three findings compound into a real production blocker:

- **The logout/revocation story is theater.** `AuthContext.logout()` only clears browser storage (`main/frontend/src/context/AuthContext.jsx:116-123`); there is no `POST /api/auth/logout` and no response interceptor in `main/frontend/src/utils/api.js` to catch a 401 from a revoked/expired token. That means the Security Center's "force logout" / "revoke session" admin feature (`main/backend/routes/securityRoutes.js`) **does not actually evict a live session** client-side, and a stolen 7-day JWT (`expiresIn: '7d'`, `authController.js:58,126`) survives a user's own logout indefinitely (F04, F06).
- **A file named `docs/login-credentials.pdf` sits untracked and ungitignored in the repo root**, one `git add .` away from being permanently baked into git history (F05, F09).
- **Analytics endpoints are an unthrottled, uncapped 5-collection full scan** reachable by any founder/superadmin, with no rate limiter and no caching (F03), compounded by two more unbounded-scan/no-caching findings on the dashboard (F15, F17).

Cross-cutting observation: the codebase has a repeated pattern of "the fix landed in one sibling but not the other" — `hrController`/`itController` duplication already diverging (F02), and `founderController`'s complaint endpoints still on the old flat `.limit(200)` pattern while `hrController`/`itController` moved to cursor pagination (F16). This suggests fixes are being applied locally instead of at the shared chokepoint, which is also exactly the shape of the auth-interceptor gap (F04) — a fix that belongs once, in `api.js`, not per-context.

None of the findings are unauthenticated-attacker-exploitable remote code execution or data-exposure holes; the HIGH items require either an authenticated session or an accidental commit. That keeps this out of CRITICAL territory, but the combination of (a) admin revocation not working, (b) a credentials file one commit away from permanent history, and (c) an unthrottled expensive endpoint is enough to call the app **NOT READY** for production until Phase 1 below is closed.

---

## 2. Risk Dashboard

| Dimension | HIGH | MEDIUM | LOW | Total |
|---|---|---|---|---|
| Security | 0 | 1 | 4 | 5 |
| API & Database | 1 | 2 | 0 | 3 |
| QA / Functional | 1 | 1 | 2 | 4 |
| DevOps / Config | 1 | 1 | 1 | 3 |
| Architecture | 0 | 5 | 1 | 6 |
| Performance | 0 | 2 | 1 | 3 |
| **Total** | **3** | **12** | **9** | **24** |

---

## 3. Top 20 Problems Ranked by Real-World Impact

| # | ID | Severity | Problem | Location |
|---|---|---|---|---|
| 1 | F05 | HIGH | `docs/login-credentials.pdf` untracked, ungitignored, one commit from permanent git history | `docs/login-credentials.pdf` |
| 2 | F04 | HIGH | No response interceptor / token-revalidation — expired or admin-revoked JWTs stay "logged in" client-side | `main/frontend/src/utils/api.js` |
| 3 | F03 | HIGH | Unthrottled, uncapped 5-collection scan on default Analytics view + CSV export | `main/backend/controllers/founderController.js:327-411` |
| 4 | F06 | MEDIUM | Logout is client-storage-only; no server-side session invalidation — 7-day JWT survives logout | `main/frontend/src/context/AuthContext.jsx:116-123` |
| 5 | F23 | MEDIUM | No boot-time validation of `JWT_SECRET`/SMTP env vars — misconfig fails at first request, not at deploy | `main/backend/server.js:1-70` |
| 6 | F16 | MEDIUM | Founder-side complaint list/search/timeline capped at 200 docs, no cursor, silently drops overflow records | `main/backend/controllers/founderController.js:63-79,800-905` |
| 7 | F15 | MEDIUM | `getDashboardOverview`/`getSlaCompliance` do fully unbounded `.get()` on users/complaints/assets | `main/backend/controllers/founderController.js:605-684,764-775` |
| 8 | F17 | MEDIUM | No TTL cache around the dashboard's 11-query overview — most expensive, most-hit endpoint in the app | `main/backend/controllers/founderController.js:605-684` |
| 9 | F20 | MEDIUM | Optimistic ticket-field edit applies to UI even when field isn't persisted — silently reverts with no warning | `main/frontend/src/context/TicketContext.jsx:238-256` |
| 10 | F18 | MEDIUM | All 7 data contexts eager-fetch on every login regardless of landing page | `main/frontend/src/App.jsx:79-96` |
| 11 | F02 | MEDIUM | `hrController.js`/`itController.js` are copy-pasted and already diverging | `main/backend/controllers/hrController.js` / `itController.js` |
| 12 | F01 | MEDIUM | 951-line, 31-handler `founderController.js` god file, no separation of concerns | `main/backend/controllers/founderController.js` |
| 13 | F11 | MEDIUM | 1317-line `DashboardPage.jsx` with 5 nested full sub-views | `main/frontend/src/pages/DashboardPage.jsx` |
| 14 | F14 | MEDIUM | Nav permission registry hand-synced against 3+ layout files with no compiler check | `main/frontend/src/context/PermissionsContext.jsx:6-58` |
| 15 | F12 | MEDIUM | Cursor-pagination pattern copy-pasted across 3 contexts | `TicketContext.jsx`, `ApprovalContext.jsx`, `TaskProjectContext.jsx` |
| 16 | F08 | LOW | `/api/auth/verify-password` has no rate limit or lockout — password brute-forceable with a stolen JWT | `main/backend/routes/authRoutes.js:23` |
| 17 | F07 | LOW | Any authenticated role (including `employee`) can list all coordinator tasks/projects org-wide | `main/backend/routes/coordinatorRoutes.js:7-8` |
| 18 | F10 | LOW | Admin password-reset only enforces 6-char minimum, no complexity | `main/backend/controllers/founderController.js:262-267` |
| 19 | F24 | LOW | No real health check (dependency-aware) and no `SIGTERM` drain handler | `main/backend/server.js:48,65-68` |
| 20 | F13 | LOW | `.limit(200)` bare literal repeated across 18 call sites in 9 files | `founderController.js` + 8 others |

*(F09 secrets-hygiene, F19 double-render, F21 error-swallow, F22 login noValidate are lower-impact and covered in the full list below.)*

---

## 4. Full Findings List (grouped by dimension)

### Security

**F04 — Auth: No response interceptor / stale-session revalidation**
Severity: HIGH · Priority: P1
Location: `main/frontend/src/utils/api.js:1-13` (no response interceptor); `main/frontend/src/context/AuthContext.jsx:76-86` (`.catch(() => {})`); `main/frontend/src/components/RequireAuth.jsx:48-70`; `main/backend/controllers/authController.js:58,126` (`expiresIn: '7d'`)
Problem: The axios instance has a request interceptor to attach the JWT but no response interceptor to catch a 401. `AuthContext`'s mount-time profile refresh silently swallows every failure, and `RequireAuth` only checks the client-side `user` object — it never re-validates against the server.
Why it matters: Once a token expires (up to 7 days) or is server-side revoked, the SPA keeps the user on protected routes. This directly defeats the Security Center's "force logout"/"revoke session" feature — an admin revoking a session does not actually evict the live client.
Risk: An admin revokes a compromised session expecting it to be dead; the attacker's live tab keeps working until the token's 7-day natural expiry.
Evidence: Zero matches for `interceptors.response` anywhere in `src`; `getSessions`/`revokeSession`/`forceLogoutUser` exist in `api.js:50-52` but nothing on the client acts on their effect.
Recommended Fix: Add a response interceptor in `api.js` that clears session + redirects to `/login` on 401 — one chokepoint fixes every context at once.
Regression Risk: Low
Testing Required: Forge/expire a token, hit any authenticated page, confirm redirect to login instead of silent request failures.

**F06 — Session management: logout doesn't invalidate the token server-side**
Severity: MEDIUM · Priority: P2
Location: `main/frontend/src/context/AuthContext.jsx:116-123`; no matching route in `main/backend/routes/authRoutes.js`
Problem: `logout()` only clears `localStorage`/`sessionStorage`. There is no `POST /api/auth/logout`; the only server-side revocation path is `PATCH /api/founder/security/sessions/:id/revoke` and `force-logout`, both superadmin-only.
Why it matters: A copied JWT (devtools, shared machine, XSS, backup sync) stays valid up to 7 days after the user clicks Logout.
Risk: User logs out on a shared computer; anyone with local access to that browser profile replays the token directly against the API for up to 7 days.
Recommended Fix: Add `POST /api/auth/logout` that revokes the session's `sid` via the existing `sessions.js` revoke path; have `AuthContext.logout()` call it before clearing storage.
Regression Risk: Low
Testing Required: Log in, call logout endpoint, replay old token against `GET /api/auth/me`, confirm 401.

**F08 — Brute force: `/verify-password` has no rate limit**
Severity: LOW · Priority: P3
Location: `main/backend/routes/authRoutes.js:23`
Problem: Unlike `/login`, this route has no `express-rate-limit` and doesn't increment `failedLoginAttempts`/trigger lockout.
Why it matters: An attacker holding a stolen JWT can brute-force the account's real password with unlimited attempts.
Risk: Credential-stuffing setup for other services the user reuses the password on.
Recommended Fix: Apply the existing `authLimiter` to this route; count attempts toward the same lockout threshold.
Regression Risk: Low
Testing Required: >10 wrong-password requests within 15 min from one IP should now be rate-limited.

**F07 — Authorization: coordinator tasks/projects readable by any role**
Severity: LOW · Priority: P3
Location: `main/backend/routes/coordinatorRoutes.js:7-8`; `main/backend/controllers/taskProjectController.js:9-24`
Problem: `GET /projects` and `GET /tasks` have `auth` but no `role(...)` gate and no server-side filtering by assignee/department.
Why it matters: Any logged-in employee can enumerate the org's full task/project backlog, including PR/Figma links — broader exposure than the per-role scoping used everywhere else (HR/IT complaints correctly scope to role or "my").
Risk: A plain-employee account calls the endpoint directly and receives every task in the system, not just their own.
Recommended Fix: Filter server-side by `req.user.id` for the employee role, or add `role('coordinator','founder')` plus a dedicated `/tasks/my` endpoint matching the complaint-controller pattern.
Regression Risk: Low
Testing Required: Log in as employee, confirm scoped results (or confirm with product owner org-wide read is intended).

**F09 — Secrets hygiene: credentials PDF process risk (backstop)**
Severity: LOW · Priority: P3
Location: `docs/login-credentials.pdf`
Problem: Same file as F05, flagged separately as a process-hygiene gap: no `.gitignore` rule for `docs/*credential*` exists as a backstop even after removal.
Why it matters: Without a gitignore rule, a similarly-named file could be re-added and committed in the future without anyone noticing.
Recommended Fix: Add `docs/*credential*` to `.gitignore` as a standing backstop, independent of deleting this specific file (see F05).
Regression Risk: Low
Testing Required: N/A — process fix.

**F10 — Password policy: admin password reset has no complexity floor**
Severity: LOW · Priority: P3
Location: `main/backend/controllers/founderController.js:262-267` (`resetUserPassword`)
Problem: Only enforces `password.length >= 6`, same weak floor as self-registration.
Why it matters: This is the password an admin sets after an account lockout — a 6-char password undermines the lockout protection elsewhere.
Recommended Fix: Raise minimum length (10+) and/or require character-class mix for admin-set passwords.
Regression Risk: Low
Testing Required: Attempt a reset with a 6-char password post-fix; confirm rejection.

### API & Database

**F03 — Unbounded analytics scan, no rate limit, no cache**
Severity: HIGH · Priority: P1
Location: `main/backend/controllers/founderController.js:327-372` (`rangedQuery`/`computeAnalytics`), used by `getAnalytics` (L375-378) and `getAnalyticsCsv` (L389-411)
Problem: `rangedQuery` only adds `.where()` when `from`/`to` are supplied. The default Analytics page load and default "Export CSV" click hit an unfiltered, unlimited `.get()` across `users`, `hr_complaints`, `it_complaints`, `approvals`, `leave_requests` simultaneously — 5 full collection reads per call, with no rate limiter mounted on `founderRoutes.js` and no caching.
Why it matters: As data volume grows, this is the single most expensive, most re-triggerable endpoint in the app.
Risk: Repeated page loads / double-clicked CSV export by any founder/superadmin session degrades or spikes Firestore read cost with no throttle.
Evidence: Confirmed at lines 327-343; `express-rate-limit` only wired into `authRoutes.js`.
Recommended Fix: Give `rangedQuery` an unconditional `.limit(N)` or default rolling window (e.g. last 90 days); add a short TTL cache shared by `getAnalytics`/`getAnalyticsCsv`.
Regression Risk: Low
Testing Required: Call with no `from`/`to` against a seeded oversized collection, confirm bounded/windowed results.

**F15 — Unbounded scans in dashboard overview and SLA compliance**
Severity: MEDIUM · Priority: P2
Location: `main/backend/controllers/founderController.js:605-684` (`getDashboardOverview`), `:764-775` (`getSlaCompliance`)
Problem: Full, uncapped `.get()` on `users`, `it_complaints`, `hr_complaints`, `assets` (dashboard) and `it_complaints`/`hr_complaints` (SLA) — no `.limit()` at all, unlike every other list endpoint in the app.
Why it matters: Cost/latency scale linearly with total historical row count forever, not with active data.
Recommended Fix: Push SLA-relevant filters into the Firestore query (status != Completed, rolling window); use `.count()` for pure-count needs, matching the pattern already used for departments/approvals/leave/sessions in the same function.
Regression Risk: Low
Testing Required: Seed >1000 docs, confirm latency and correctness.

**F16 — Founder-side complaint endpoints still on flat 200-doc cap, no cursor**
Severity: MEDIUM · Priority: P2
Location: `main/backend/controllers/founderController.js:63-79` (`getAllComplaints`), `:800-842` (`search`), `:851-905` (`getActivityTimeline`)
Problem: These cap `hr_complaints`/`it_complaints`/`approvals` reads at a flat `.limit(200)` with no cursor and no "has more" signal — unlike `hrController`/`itController`/`approvalController`'s sibling endpoints, which already use the real cursor-based `paginatedQuery()` utility.
Why it matters: Once either collection exceeds 200 docs, the founder's "All Complaints" view, global search, and activity timeline silently miss overflow tickets with no error or UI indication — the exact correctness gap the sibling endpoints already had fixed, but the fix didn't propagate here.
Recommended Fix: Route these through the existing `paginatedQuery()` cursor pattern, or add an explicit "results truncated" flag.
Regression Risk: Low
Testing Required: Seed >200 docs, confirm UI indicates truncation rather than silently omitting records.

### QA / Functional

**F04** — see Security section above (cross-listed dimension: `qa_functional`).

**F20 — Silent data loss on non-editable ticket field edits**
Severity: MEDIUM · Priority: P2
Location: `main/frontend/src/context/TicketContext.jsx:238-256` (`updateTicketField`)
Problem: The edit is applied to local state optimistically (line 244) *before* checking `EDITABLE_FIELDS`. If the field isn't allowed for that department, it returns early without calling the API and without reverting the optimistic change or warning the user.
Why it matters: The UI shows the edited value, but it was never persisted — it silently disappears on next refresh/poll/reload with no error shown.
Evidence: `setTickets(...)` runs before the `EDITABLE_FIELDS` check and early return.
Recommended Fix: Hide/disable inputs for non-editable fields per department (the set is already known client-side), or surface a toast when a local edit won't persist.
Regression Risk: Low
Testing Required: As HR, edit a field only valid for IT tickets, confirm it disappears silently pre-fix / warns post-fix.

**F21 — `applyLeave` swallows errors instead of rethrowing**
Severity: LOW · Priority: P3
Location: `main/frontend/src/context/LeaveContext.jsx:69-76`
Problem: Unlike `addTicket`/`submitApproval`, which rethrow on failure, `applyLeave` only `console.error`s. Currently latent — no UI component calls `applyLeave` yet.
Why it matters: Any future form awaiting `applyLeave()` the way `NewItTicketModal` awaits `addTicket()` would show a false success screen on failure.
Recommended Fix: Add `throw e;` to match the rethrow convention, before any leave-application UI is wired up.
Regression Risk: Low
Testing Required: None exploitable today; verify once a leave form exists.

**F22 — Login form disables native validation with no client-side fallback**
Severity: LOW · Priority: P3
Location: `main/frontend/src/pages/LoginPage.jsx:84` (`noValidate`), `:62-69`
Problem: `noValidate` disables browser-native empty-field blocking, relying only on `IconField`'s own enforcement (not inspected). Network failures get the same generic error message as any non-401 backend error.
Recommended Fix: Low priority — add distinct network-error copy (`err.code === 'ERR_NETWORK'`) if desired. Not blocking.
Regression Risk: Low
Testing Required: Submit while offline, confirm messaging is acceptable.

### DevOps / Config

**F05 — Untracked credentials PDF in repo working tree**
Severity: HIGH · Priority: P1
Location: `docs/login-credentials.pdf`
Problem: A 141KB, 2-page PDF literally named `login-credentials.pdf` sits untracked in `docs/`. Unlike `.env` (covered by root `.gitignore`'s `.env*` rule), `docs/` has no matching ignore rule — `git check-ignore -v docs/login-credentials.pdf` confirms it is not ignored. Sibling `docs/*.pdf` files are already tracked, showing this directory gets committed wholesale.
Why it matters: A routine `git add .`/`git add docs` permanently bakes whatever credentials it contains into git history, removable only via history rewrite plus mandatory credential rotation.
Recommended Fix: Do not commit. Move the file out of the repo (password manager/secret vault); add a `docs/*credential*` gitignore rule as a backstop; if it was ever committed on any branch, rotate every credential it contains immediately.
Regression Risk: Low
Testing Required: Confirm `git status`/`git check-ignore` no longer flag it as trackable.

**F23 — No boot-time env var validation**
Severity: MEDIUM · Priority: P2
Location: `main/backend/server.js:1-70`
Problem: `JWT_SECRET` and SMTP vars are read lazily wherever used (`authController.js:57,125`; `utils/mailer.js:10`), with no startup assertion. Only Firebase creds are checked (with an emulator fallback).
Why it matters: A misconfigured deployment (missing `JWT_SECRET`) starts successfully and only fails on the first login attempt when `jwt.sign` throws — turning a config mistake into a production incident instead of a failed deploy/CI smoke check.
Recommended Fix: Add a startup check that throws/exits if `JWT_SECRET` (and `SMTP_*` if email features are required) are unset.
Regression Risk: Low
Testing Required: Start with `JWT_SECRET` unset, confirm immediate failure with a clear message.

**F24 — No dependency-aware health check or graceful shutdown**
Severity: LOW · Priority: P3
Location: `main/backend/server.js:48,65-68`
Problem: The only "health" endpoint (`GET /`) returns a static JSON message with no Firestore reachability check; no `SIGTERM`/`SIGINT` handler exists to drain in-flight requests for non-Vercel deployments.
Why it matters: An orchestrator can't distinguish "process up" from "Firestore reachable"; a rolling restart hard-kills in-flight requests instead of draining them.
Recommended Fix: Add a `/healthz` route doing a lightweight Firestore ping and reporting emulator-vs-real status; add a `SIGTERM` handler calling `server.close()` for non-Vercel deployments.
Regression Risk: Low
Testing Required: Hit health endpoint with Firestore up/down; send `SIGTERM` mid-request, confirm graceful completion.

### Architecture

**F01 — `founderController.js` god file (951 lines, 31 handlers)**
Severity: MEDIUM · Priority: P2
Location: whole file
Problem: One controller backs user management, audit logs, analytics + CSV export, global search, activity timeline, dashboard, SLA policies/compliance, notification rules, role/action permissions, and departments CRUD, mirroring the equally unfocused `founderRoutes.js` (94 lines).
Why it matters: Any change to one concern requires touching a 951-line file shared by unrelated features, increasing merge conflicts and review difficulty.
Recommended Fix: Split into `superAdminUserController`, `analyticsController`, `slaController`, `notificationController`, `departmentController`, `permissionController`, matching a corresponding route split.
Regression Risk: Medium
Testing Required: Smoke test every founder/superadmin endpoint post-split to confirm no handler dropped or mis-wired.

**F02 — `hrController.js`/`itController.js` copy-paste duplication, already diverging**
Severity: MEDIUM · Priority: P2
Location: `main/backend/controllers/hrController.js` (294 lines) vs `itController.js` (298 lines)
Problem: `create`/`list`/`my`/`search`/`status`/`fields`/`delete` handlers, the duration helper, and `enrichWithUserRole` are structurally identical (collection name and a few extra IT-only fields aside).
Why it matters: A bug fix has to be applied twice by hand; the files have already begun drifting (IT gained department-resolution/extra fields HR lacks).
Recommended Fix: Extract a shared `createComplaintController(collectionName, extraFields)` factory both route files instantiate.
Regression Risk: Medium
Testing Required: Integration test HR and IT complaint create/list/search/status/delete post-refactor.

**F11 — `DashboardPage.jsx` god component (1317 lines, 5 nested full views)**
Severity: MEDIUM · Priority: P2
Location: whole file; nested components at lines 45, 176, 598, 765, 886
Problem: Data-requests, assets, reports, render-add modal, and rendering-status views are all nested top-level function components inside one page file, with business logic (asset CRUD, render transitions, report generation) embedded directly.
Why it matters: Hard to navigate, hard to code-split further, hard to unit-test views in isolation. Same pattern recurs at smaller scale in `EmployeeDashboardPage.jsx` (862 lines) and `FounderDashboardPage.jsx` (668 lines).
Recommended Fix: Extract each nested view into its own file under `components/`, imported into `DashboardPage.jsx` as the composition root.
Regression Risk: Low
Testing Required: Manual smoke test of each IT dashboard tab post-extraction.

**F12 — Cursor-pagination pattern copy-pasted across 3 contexts**
Severity: MEDIUM · Priority: P2
Location: `TicketContext.jsx:101-154`, `ApprovalContext.jsx:32-64`, `TaskProjectContext.jsx:32-69`
Problem: The `nextCursor`/`loadingMore`/`hasMore`/`loadMoreX` pattern is duplicated near-identically across three contexts, each with its own state triplet.
Why it matters: A pagination bug fix must be replicated three times; future contexts needing pagination are likely to re-copy rather than reuse.
Recommended Fix: Extract a `useCursorPagination(fetchPage)` hook returning `{items, nextCursor, loadingMore, hasMore, loadMore, reset}`.
Regression Risk: Low
Testing Required: Verify Load More still works for tickets, approvals, and tasks post-refactor.

**F13 — Bare `.limit(200)` literal repeated across 18 call sites in 9 files**
Severity: LOW · Priority: P3
Location: `founderController.js:65-66,809-813,860-862` and repeated in `assetController.js`, `taskProjectController.js`, `leaveController.js`, `securityController.js`, `hrController.js`, `itController.js`, `hrDeskController.js`, `renderController.js`
Problem: The Firestore read-bound cap is a bare numeric literal repeated ~18 times instead of a named constant.
Why it matters: Changing the cap means hunting down every literal, risking an inconsistent cap left on some endpoint.
Recommended Fix: Define `UNPAGINATED_READ_LIMIT = 200` once in a shared constants module; import at each call site.
Regression Risk: Low
Testing Required: None beyond confirming the constant matches 200 everywhere; no behavior change.

**F14 — Nav permission registry hand-synced against 3+ layout files**
Severity: MEDIUM · Priority: P2
Location: `main/frontend/src/context/PermissionsContext.jsx:10-58` (`PAGE_REGISTRY`)
Problem: `PAGE_REGISTRY` hardcodes every nav page id/label per role; the code comment explicitly states it must be "kept in sync by hand" with separate `NAV_ITEMS` arrays in `ItDeskLayout.jsx`, `HrLayout.jsx`, `CoordinatorLayout.jsx`, and `FounderDashboardPage.jsx`'s `SIDEBAR_ORDER`.
Why it matters: Adding/renaming/removing a nav item requires updating two independent sources of truth with no compiler check; a missed update can silently permit access to a page with no nav entry, or show a nav item permission gating can never disable.
Recommended Fix: Have layouts' `NAV_ITEMS` import from `PAGE_REGISTRY` (or generate the registry from the layouts) so there is one source of truth.
Regression Risk: Low
Testing Required: Confirm nav rendering and permission-gated access still match for all 5 roles post-consolidation.

### Performance

**F17 — No caching around the 11-query dashboard overview**
Severity: MEDIUM · Priority: P2
Location: `main/backend/controllers/founderController.js:605-684`
Problem: Every Super Admin dashboard load fires 11 concurrent Firestore reads, 5 of which (`users`, `it_complaints`, `hr_complaints`, `assets`, SLA policies) are full unbounded scans with no server-side caching — unlike `authMiddleware`'s 60s profile cache and `permissionMiddleware`'s 30s matrix cache, which already establish the pattern in this codebase.
Why it matters: Latency and read cost scale linearly with total row counts on every dashboard view, and this is the Super Admin landing page — the most-hit endpoint in the app.
Recommended Fix: Add a short in-process TTL cache (30-60s) around `computeDashboardOverview`'s result, matching `authMiddleware`'s existing pattern; switch count-only reads to `.count().get()`.
Regression Risk: Low
Testing Required: Verify dashboard accuracy stays acceptable within the cache TTL, including immediately after a user-create action.

**F18 — All 7 data contexts eager-fetch globally on every login**
Severity: MEDIUM · Priority: P2
Location: `main/frontend/src/App.jsx:79-96` + each context's mount-time `useEffect(refresh)`
Problem: All 7 providers wrap the entire router rather than being scoped per-route, and each fires `refresh()` unconditionally on mount — up to 4-5 concurrent API calls on login regardless of the landing page (e.g. an IT user landing on Dashboard still eagerly fetches Asset Management and Rendering Status data).
Why it matters: Inflates time-to-interactive on login and wastes backend reads for pages never opened in short sessions.
Recommended Fix: Lazy-init each context's fetch on first real consumer mount rather than provider mount, or defer non-visible-page refreshes until that route is actually navigated to.
Regression Risk: Medium
Testing Required: Confirm every page still shows fresh data on first visit, and shared-queue polling still starts correctly.

**F19 — `DataTable.tsx` always renders both desktop and mobile layouts**
Severity: LOW · Priority: P3
Location: `main/frontend/src/components/DataTable.tsx:147-210`
Problem: Both the desktop `<table>` and mobile `<ul>` card list render for every page of rows unconditionally, toggled purely via CSS (`hidden md:block`/`md:hidden`).
Why it matters: Every table across ~10+ pages does double DOM creation and cell-render work per row, even though only one layout is ever visible.
Recommended Fix: Use a `matchMedia`-based check to render only the active layout, or document the current approach as a deliberate no-JS/SSR tradeoff.
Regression Risk: Low
Testing Required: Verify no hydration mismatch/layout flash; check responsive breakpoint behavior on resize.

---

## 5. Scores (0–10, evidence-based)

| Area | Score | Rationale |
|---|---|---|
| **Security** | **5/10** | Solid base (JWT + role middleware + permission matrix + rate-limited login + account lockout), but the admin "revoke session"/"force logout" feature doesn't actually work client-side (F04/F06), a credentials file sits uncommitted-but-unprotected in the tree (F05/F09), password-verification brute force is unmitigated (F08), and one route has a real authorization gap (F07). |
| **Architecture** | **5/10** | Clean provider/middleware layering conceptually, but two god files (F01, F11), duplicated controller and pagination logic (F02, F12), a hand-synced dual source of truth for nav permissions (F14), and scattered magic numbers (F13) — real maintainability debt, no design-breaking flaws. |
| **Performance** | **5/10** | Three distinct unbounded/uncached full-collection-scan patterns on the same controller (F03, F15, F17), plus an eager global-fetch-on-login pattern (F18) and a minor always-double-render cost (F19). Fine at current data volume, degrades predictably as data grows. |

---

## 6. Production Readiness Checklist

- [ ] **No credential-bearing files in the repo working tree** — `docs/login-credentials.pdf` is present and uncovered by `.gitignore` (F05)
- [ ] **Server-side session/token revocation actually works end-to-end** — force-logout/revoke-session doesn't evict a live client (F04, F06)
- [ ] **All expensive endpoints are bounded and/or rate-limited** — analytics, dashboard overview, and SLA compliance are unbounded and unthrottled (F03, F15, F17)
- [ ] **List endpoints paginate consistently without silent truncation** — founder-side complaint endpoints still on a flat 200-cap with no cursor (F16)
- [ ] **Required env vars validated at boot** — `JWT_SECRET`/SMTP vars only fail lazily at request time (F23)
- [x] **Login is rate-limited and account-lockout protected** — confirmed via `authLimiter` + `LOCK_THRESHOLD` in `authController.js`
- [x] **Route-level RBAC applied consistently** — `roleMiddleware`/`permissionMiddleware` present on nearly all sensitive routes (one gap: F07)
- [ ] **Sensitive secondary auth endpoints rate-limited** — `/verify-password` is not (F08)
- [ ] **No optimistic UI writes that can silently discard user data** — ticket field edits can silently revert (F20)
- [ ] **Health/readiness check reflects real dependency status; graceful shutdown implemented** — health check is static, no `SIGTERM` handling (F24)
- [ ] **No large god-files/duplicated business logic blocking safe iteration** — F01, F02, F11, F12, F14 outstanding

---

## 7. Recommended Fix Plan

**Phase 1 — Critical Security & Data Risks**
F05 (credentials PDF), F04 (no response interceptor / stale session), F03 (unbounded analytics scan)

**Phase 2 — Session & Auth Hardening**
F06 (server-side logout), F08 (rate-limit verify-password), F10 (admin password-reset policy), F09 (gitignore backstop)

**Phase 3 — Authorization & Access Control**
F07 (coordinator routes role/scope gap)

**Phase 4 — API/Database Correctness & Scale**
F16 (founder complaint pagination), F15 (dashboard/SLA unbounded scans)

**Phase 5 — Performance & Caching**
F17 (dashboard overview caching), F18 (eager context fetch on login), F19 (DataTable double render)

**Phase 6 — QA / Data Integrity**
F20 (silent ticket-field revert), F21 (applyLeave error swallow), F22 (login form validation)

**Phase 7 — Architecture Cleanup**
F01 (founderController split), F02 (hr/it controller dedup), F11 (DashboardPage decomposition), F12 (pagination hook extraction), F14 (nav permission single source of truth), F13 (limit-constant extraction)

**Phase 8 — Production Hardening**
F23 (boot-time env validation), F24 (health check + graceful shutdown)
