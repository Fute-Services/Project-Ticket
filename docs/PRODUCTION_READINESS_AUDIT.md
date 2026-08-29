# Production Readiness Audit: Project-Ticket (Fute Portal)

**Scope:** `main/backend` (the Express server plus Firestore, the database) and `main/frontend` (the React 18 website, a single-page app that updates without full page reloads). **Date:** 2026-08-24. **Findings verified:** 24 total (3 HIGH severity, 12 MEDIUM severity, 9 LOW severity, no CRITICAL findings).

---

## 1. Executive Summary

| Dimension | Rating |
|---|---|
| Architecture (how the code is organized) | NEEDS IMPROVEMENT |
| Security | NEEDS IMPROVEMENT |
| QA / Functional Correctness (does it work as intended) | NEEDS IMPROVEMENT |
| Performance | NEEDS IMPROVEMENT |
| Scalability (how well it holds up as data and users grow) | NEEDS IMPROVEMENT |
| **Overall Production Readiness** | **NOT READY** |

The app has a coherent, defensible baseline architecture: layered login checks (a signed token called a JWT, plus role-based middleware, plus a separate permission matrix), data fetched per section of the app, and consistent role-based access rules applied across the whole API. Nothing here is "broken" in the sense of not working. But three findings combine into a real blocker before this can go to production:

- **The logout/revocation story is theater**, meaning it looks like it works but doesn't. `AuthContext.logout()` only clears the browser's local storage (`main/frontend/src/context/AuthContext.jsx:116-123`). There is no `POST /api/auth/logout` on the server, and no response interceptor (a piece of code that watches every API response for a "your session is invalid" signal) in `main/frontend/src/utils/api.js` to catch a 401 (the standard "not authorized" error code) from a token that's expired or been revoked. That means the Security Center's "force logout" and "revoke session" admin feature (`main/backend/routes/securityRoutes.js`) does not actually kick a live user off their session on their screen. A stolen login token, valid for 7 days (`expiresIn: '7d'`, `authController.js:58,126`), keeps working even after the real user logs out (findings F04, F06).
- **A file named `docs/login-credentials.pdf` sits untracked and ungitignored in the repo root.** "Untracked" means Git (the version-control tool that saves every change) doesn't yet consider it part of the project history, and "ungitignored" means there's no rule stopping someone from accidentally adding it. It's one `git add .` command away from being permanently baked into the project's history, where it could never be fully removed (findings F05, F09).
- **The analytics pages run an unthrottled, uncapped scan across 5 database collections** (a "collection" in Firestore is like a folder of records) every time they load, reachable by any founder or superadmin account, with nothing limiting how often this can happen and no caching to reuse recent results (finding F03), plus two more similar unbounded-scan, no-caching findings on the main dashboard (F15, F17).

One pattern shows up repeatedly across these findings: a fix landed in one twin file but not the other. For example, `hrController` and `itController` started as identical files and have already begun drifting apart (F02), and `founderController`'s complaint-listing endpoints are still using the old flat `.limit(200)` approach (just grab the first 200 records) while the equivalent code in `hrController`/`itController` was upgraded to a proper "cursor" pagination system (a way of paging through results without missing or repeating records) (F16). This suggests fixes are being made in one spot at a time instead of at the one shared place all the code routes through, which is also exactly the shape of the missing-interceptor gap (F04): that fix belongs once, in `api.js`, not copied into every section of the app separately.

None of these findings let a complete stranger with no account break in or steal data remotely; the HIGH-severity items require either an already-logged-in session or an accidental commit to Git. That keeps this out of CRITICAL territory. But the combination of (a) admin-triggered logout not actually working, (b) a credentials file one commit away from being permanently recorded, and (c) an easily-repeatable expensive endpoint with no limit, is enough to call the app **NOT READY** for production until Phase 1 below is closed out.

---

## 2. Risk Dashboard

| Dimension | HIGH | MEDIUM | LOW | Total |
|---|---|---|---|---|
| Security | 0 | 1 | 4 | 5 |
| API & Database | 1 | 2 | 0 | 3 |
| QA / Functional | 1 | 1 | 2 | 4 |
| DevOps / Config (deployment and setup) | 1 | 1 | 1 | 3 |
| Architecture | 0 | 5 | 1 | 6 |
| Performance | 0 | 2 | 1 | 3 |
| **Total** | **3** | **12** | **9** | **24** |

---

## 3. Top 20 Problems Ranked by Real-World Impact

| # | ID | Severity | Problem | Location |
|---|---|---|---|---|
| 1 | F05 | HIGH | `docs/login-credentials.pdf` is untracked and unprotected, one commit away from being permanently recorded in Git's history | `docs/login-credentials.pdf` |
| 2 | F04 | HIGH | No response interceptor and no re-check of login status. Expired or admin-revoked login tokens still look "logged in" on the user's screen | `main/frontend/src/utils/api.js` |
| 3 | F03 | HIGH | Unthrottled, uncapped scan across 5 collections every time the default Analytics view or CSV export loads | `main/backend/controllers/founderController.js:327-411` |
| 4 | F06 | MEDIUM | Logging out only clears data in the browser; there's no server-side invalidation, so a 7-day login token keeps working after logout | `main/frontend/src/context/AuthContext.jsx:116-123` |
| 5 | F23 | MEDIUM | No check at startup that required settings like `JWT_SECRET` (the secret key used to sign login tokens) or email settings are actually configured. A misconfiguration only fails on the first real request, not when the server starts | `main/backend/server.js:1-70` |
| 6 | F16 | MEDIUM | The founder's complaint list, search, and timeline are capped at 200 records with no way to see more, and overflow records are dropped silently | `main/backend/controllers/founderController.js:63-79,800-905` |
| 7 | F15 | MEDIUM | `getDashboardOverview` and `getSlaCompliance` read entire collections of users, complaints, and assets with no limit | `main/backend/controllers/founderController.js:605-684,764-775` |
| 8 | F17 | MEDIUM | No temporary caching around the dashboard's 11 database queries, even though it's the most-visited page in the app | `main/backend/controllers/founderController.js:605-684` |
| 9 | F20 | MEDIUM | An edit to a ticket field can show as successful on screen even when it wasn't actually saved, and it silently reverts with no warning | `main/frontend/src/context/TicketContext.jsx:238-256` |
| 10 | F18 | MEDIUM | All 7 sections of data load automatically on every login, regardless of which page the user actually lands on | `main/frontend/src/App.jsx:79-96` |
| 11 | F02 | MEDIUM | `hrController.js` and `itController.js` were copy-pasted from each other and are already drifting apart | `main/backend/controllers/hrController.js` / `itController.js` |
| 12 | F01 | MEDIUM | One 951-line file with 31 separate functions handles far too many unrelated jobs | `main/backend/controllers/founderController.js` |
| 13 | F11 | MEDIUM | A single 1,317-line page file contains 5 entire nested sub-views | `main/frontend/src/pages/DashboardPage.jsx` |
| 14 | F14 | MEDIUM | The list of what each role can see in the navigation menu is manually copied across 3 or more files with nothing to catch it if they fall out of sync | `main/frontend/src/context/PermissionsContext.jsx:6-58` |
| 15 | F12 | MEDIUM | The same "load more results" pagination logic is copy-pasted across 3 different sections of the app | `TicketContext.jsx`, `ApprovalContext.jsx`, `TaskProjectContext.jsx` |
| 16 | F08 | LOW | The password re-check endpoint (`/api/auth/verify-password`) has no limit on attempts, so a password can be guessed repeatedly by anyone holding a stolen login token | `main/backend/routes/authRoutes.js:23` |
| 17 | F07 | LOW | Any logged-in account, including a plain employee, can list every coordinator task and project company-wide | `main/backend/routes/coordinatorRoutes.js:7-8` |
| 18 | F10 | LOW | When an admin resets someone's password, it only requires 6 characters with no other rules | `main/backend/controllers/founderController.js:262-267` |
| 19 | F24 | LOW | There's no real "is the app actually healthy" check that also verifies the database is reachable, and no graceful shutdown when the server restarts | `main/backend/server.js:48,65-68` |
| 20 | F13 | LOW | The number 200, used as a hard cap on database reads, is typed out by hand in 18 different places across 9 files instead of being defined once | `founderController.js` + 8 others |

*(F09, about credential-file hygiene as a backup safeguard; F19, about rendering the page twice; F21, about a swallowed error; and F22, about a login form skipping browser validation, are lower-impact and covered in the full list below.)*

---

## 4. Full Findings List (grouped by dimension)

### Security

**F04: Login checks: no response interceptor, no re-check of a stale session**
Severity: HIGH · Priority: P1 (fix first)
Location: `main/frontend/src/utils/api.js:1-13` (no response interceptor exists); `main/frontend/src/context/AuthContext.jsx:76-86` (a failure here is silently ignored with `.catch(() => {})`); `main/frontend/src/components/RequireAuth.jsx:48-70`; `main/backend/controllers/authController.js:58,126` (tokens are set to expire in 7 days)
The problem: the app's networking code has a piece that attaches the login token to every outgoing request, but nothing that watches for a 401 "not authorized" response coming back. When the app checks the user's profile on page load, any failure there is quietly swallowed and ignored. And `RequireAuth`, the component that decides whether to show a protected page, only looks at the login info already stored in the browser. It never actually asks the server "is this still valid?"
Why it matters: once a token expires (which can take up to 7 days) or is revoked by an admin, the app keeps showing the user protected pages as if nothing happened. This directly breaks the Security Center's "force logout" and "revoke session" feature: an admin thinks they've kicked someone out, but the person's browser tab keeps working.
The risk in practice: an admin revokes a session they believe is compromised, expecting it to stop working immediately. Instead, the attacker's open tab keeps functioning until the token naturally expires up to 7 days later.
Evidence: searching the whole `src` folder for the phrase `interceptors.response` (the code pattern that would catch this) returns zero matches. The functions to fetch sessions and revoke them do exist (`getSessions`, `revokeSession`, `forceLogoutUser` in `api.js:50-52`), but nothing on the user's side of the app actually reacts when a revoke takes effect.
Recommended fix: add a response interceptor in `api.js` that, on receiving a 401, clears the session and redirects to the login page. Fixing it in this one shared spot automatically fixes it everywhere in the app at once.
Regression risk (chance the fix breaks something else): Low.
Testing required: forge or manually expire a token, visit any protected page, and confirm the app redirects to login instead of just failing silently.

**F06: Session management: logging out doesn't actually invalidate the token on the server**
Severity: MEDIUM · Priority: P2
Location: `main/frontend/src/context/AuthContext.jsx:116-123`; there is no matching route in `main/backend/routes/authRoutes.js`
The problem: `logout()` only clears the browser's saved login data (`localStorage`/`sessionStorage`, two ways browsers remember information between visits). There's no `POST /api/auth/logout` endpoint on the server at all. The only way to actually revoke a session server-side today is through the superadmin-only "revoke" and "force-logout" tools.
Why it matters: if a login token was ever copied, whether through browser developer tools, a shared computer, a malicious script, or a synced backup, that copy keeps working for up to 7 days after the real user clicks Logout.
The risk in practice: someone logs out on a shared computer. Anyone with access to that browser profile can still use the old token directly against the API for up to 7 days.
Recommended fix: add a real `POST /api/auth/logout` endpoint that revokes the session's ID through the existing `sessions.js` revoke mechanism, and have `AuthContext.logout()` call it before clearing the browser's stored data.
Regression risk: Low.
Testing required: log in, call the logout endpoint, then try reusing the old token against `GET /api/auth/me` and confirm it now returns a 401 error.

**F08: Brute force: the password re-check endpoint has no rate limit**
Severity: LOW · Priority: P3
Location: `main/backend/routes/authRoutes.js:23`
The problem: unlike the main `/login` route, this endpoint (used to confirm your password again for sensitive actions) has no attempt limiter and doesn't count toward the failed-login lockout.
Why it matters: someone holding a stolen login token can try unlimited password guesses against the real account.
The risk in practice: this becomes a setup for credential stuffing, meaning a leaked password guessed here could then be tried against other services the same person uses.
Recommended fix: apply the same rate limiter already used on `/login` to this route, and count attempts toward the same lockout.
Regression risk: Low.
Testing required: send more than 10 wrong-password attempts within 15 minutes from one location and confirm it now gets blocked.

**F07: Authorization: coordinator tasks and projects are readable by any role**
Severity: LOW · Priority: P3
Location: `main/backend/routes/coordinatorRoutes.js:7-8`; `main/backend/controllers/taskProjectController.js:9-24`
The problem: the endpoints that list all projects and tasks require being logged in, but don't check the user's role, and don't filter results down to only what that person is assigned to.
Why it matters: any logged-in employee can pull up the company's entire task and project backlog, including links to pull requests and design files, which is far broader access than every other part of the app allows (HR and IT complaints, for comparison, are correctly limited to a person's own role or their own records).
The risk in practice: a regular employee account calls this endpoint directly and receives every task in the whole system, not just their own.
Recommended fix: either filter results server-side to the logged-in user for the employee role, or restrict the endpoint to coordinator and founder roles and add a separate "my tasks" endpoint, matching how the complaint system already works.
Regression risk: Low.
Testing required: log in as an employee and confirm results are now scoped down (or confirm with the product owner that company-wide visibility is actually intended).

**F09: Secrets hygiene: a backup safeguard for the credentials file**
Severity: LOW · Priority: P3
Location: `docs/login-credentials.pdf`
The problem: this is the same file flagged in F05, called out separately here as a process gap: there's no rule in `.gitignore` (the file that tells Git which files to never track) covering anything named like `docs/*credential*`, even as a backup safeguard after the file itself is removed.
Why it matters: without that rule, a similarly-named file could be added again in the future and accidentally committed without anyone noticing.
Recommended fix: add a `docs/*credential*` rule to `.gitignore` as a standing safeguard, separate from actually deleting this specific file (see F05).
Regression risk: Low.
Testing required: not applicable, this is a process fix rather than a code change.

**F10: Password policy: admin-triggered password resets have no complexity requirement**
Severity: LOW · Priority: P3
Location: `main/backend/controllers/founderController.js:262-267` (`resetUserPassword`)
The problem: this only requires the new password to be at least 6 characters, the same weak minimum as self-registration.
Why it matters: this is the password an admin sets after unlocking a locked-out account. A weak 6-character password here undermines the protection the lockout system is otherwise providing.
Recommended fix: raise the minimum length to 10 or more characters, and consider requiring a mix of character types for admin-set passwords.
Regression risk: Low.
Testing required: attempt a reset with a 6-character password after the fix and confirm it's rejected.

### API & Database

**F03: Unbounded analytics scan, with no rate limit and no caching**
Severity: HIGH · Priority: P1
Location: `main/backend/controllers/founderController.js:327-372` (the `rangedQuery`/`computeAnalytics` functions), used by `getAnalytics` (lines 375-378) and `getAnalyticsCsv` (lines 389-411)
The problem: the `rangedQuery` function only limits its search when a from/to date range is actually supplied. So the default Analytics page load, and the default "Export CSV" button click, both trigger an unfiltered, unlimited read across 5 entire collections at once (`users`, `hr_complaints`, `it_complaints`, `approvals`, `leave_requests`), with no rate limiter mounted on `founderRoutes.js` and no caching of results.
Why it matters: as the amount of stored data grows, this becomes the single most expensive, most easily repeated operation anywhere in the app.
The risk in practice: repeated page visits, or someone double-clicking the CSV export button, by any founder or superadmin account, can spike database read costs with nothing slowing it down.
Evidence: confirmed at lines 327 to 343; the rate-limiting library used elsewhere is only wired into `authRoutes.js`, nowhere near this endpoint.
Recommended fix: give `rangedQuery` an always-on cap, or a default rolling window (for example, the last 90 days), and add a short-lived shared cache for both `getAnalytics` and `getAnalyticsCsv`.
Regression risk: Low.
Testing required: call the endpoint with no date range against a deliberately oversized test collection, and confirm results are now bounded or windowed.

**F15: Unbounded scans in the dashboard overview and SLA compliance views**
Severity: MEDIUM · Priority: P2
Location: `main/backend/controllers/founderController.js:605-684` (`getDashboardOverview`), and lines 764-775 (`getSlaCompliance`)
The problem: these read the entire `users`, `it_complaints`, `hr_complaints`, and `assets` collections (for the dashboard) and the entire complaint collections (for SLA compliance), with no cap at all, unlike every other list-style endpoint in the app.
Why it matters: cost and loading time grow in direct proportion to the total historical record count forever, not just the active, currently-relevant data.
Recommended fix: push SLA-relevant filtering (for example, excluding completed items, or only looking at a recent rolling window) directly into the database query, and use Firestore's built-in `.count()` feature for anywhere only a count is needed, matching the pattern already used elsewhere in the same function for departments, approvals, leave, and sessions.
Regression risk: Low.
Testing required: seed the database with over 1,000 test records and confirm loading time and correctness are still acceptable.

**F16: The founder's complaint-related endpoints are still capped at a flat 200 records with no way to page through more**
Severity: MEDIUM · Priority: P2
Location: `main/backend/controllers/founderController.js:63-79` (`getAllComplaints`), lines 800-842 (`search`), lines 851-905 (`getActivityTimeline`)
The problem: these cap reads from `hr_complaints`, `it_complaints`, and `approvals` at a flat 200 records, with no cursor (a bookmark that lets you fetch the next batch) and no signal telling the user there might be more results. This is unlike the equivalent HR, IT, and approval endpoints, which already use a proper cursor-based pagination helper.
Why it matters: once either collection passes 200 records, the founder's "All Complaints" view, global search, and activity timeline all start silently missing overflow tickets, with no error or on-screen warning. This is exactly the correctness problem that was already fixed in the sibling endpoints, but the fix never made it here.
Recommended fix: route these through the same existing cursor-based pagination helper, or at minimum add a clear "results may be incomplete" flag.
Regression risk: Low.
Testing required: seed over 200 test records and confirm the interface now shows a truncation notice instead of silently dropping records.

### QA / Functional

**F04** is also relevant here; see the Security section above for full detail.

**F20: Editing a ticket field can silently lose the change**
Severity: MEDIUM · Priority: P2
Location: `main/frontend/src/context/TicketContext.jsx:238-256` (`updateTicketField`)
The problem: when a field is edited, the change is shown on screen immediately (an "optimistic update," meaning the interface assumes success before hearing back from the server) before the code checks whether that field is actually allowed to be edited for that department. If it isn't allowed, the function quietly stops, without calling the server and without undoing the on-screen change or telling the user anything went wrong.
Why it matters: the interface shows the edited value as if it saved, but it was never actually stored. It vanishes the next time the page refreshes or updates, with no error message ever shown.
Evidence: the code that updates what's shown on screen runs before the check for which fields are allowed, and the early exit that follows shows nothing to the user.
Recommended fix: either hide or disable input fields that aren't editable for a given department (the app already knows this list on the browser side), or show a small notification whenever a local edit won't actually be saved.
Regression risk: Low.
Testing required: while logged in as HR, edit a field that's only valid for IT tickets, and confirm it now warns instead of silently disappearing.

**F21: `applyLeave` silently swallows errors instead of surfacing them**
Severity: LOW · Priority: P3
Location: `main/frontend/src/context/LeaveContext.jsx:69-76`
The problem: unlike similar functions (`addTicket`, `submitApproval`) that pass failures back up so the calling screen can react, `applyLeave` only logs the error to the browser console and stops there. This is currently harmless since no screen in the app calls `applyLeave` yet.
Why it matters: any future leave-request form built the way the ticket form already works would show a false "success" screen even when the request actually failed.
Recommended fix: add the missing `throw e;` so it matches the pattern used elsewhere, before any leave-request screen gets built on top of it.
Regression risk: Low.
Testing required: nothing is exploitable today; this should be verified once a leave-request screen actually exists.

**F22: The login form turns off the browser's built-in validation with no replacement**
Severity: LOW · Priority: P3
Location: `main/frontend/src/pages/LoginPage.jsx:84` (the `noValidate` attribute), and lines 62-69
The problem: `noValidate` disables the browser's native "please fill in this field" checks, relying only on whatever the `IconField` component does on its own (not reviewed here). Also, a network failure (like being offline) shows the exact same generic error message as any other server error.
Recommended fix: this is low priority. If desired, add a distinct message for network failures specifically (checking for `err.code === 'ERR_NETWORK'`). Not a blocker.
Regression risk: Low.
Testing required: submit the form while offline and confirm the message shown is acceptable.

### DevOps / Config (deployment and setup)

**F05: An untracked credentials PDF sits in the working project folder**
Severity: HIGH · Priority: P1
Location: `docs/login-credentials.pdf`
The problem: a 141KB, 2-page PDF literally named `login-credentials.pdf` sits in the `docs/` folder without being tracked by Git yet. Unlike `.env` files (which the project's root `.gitignore` rule already protects), the `docs/` folder has no matching protection rule. Running `git check-ignore -v docs/login-credentials.pdf` confirms this: it is not currently protected. Other PDF files already sitting in `docs/` are tracked by Git, which shows this whole folder tends to get committed as a batch.
Why it matters: a routine `git add .` or `git add docs` command would permanently record whatever credentials are inside this file into the project's history, a mistake that can only be undone by rewriting Git history and, more importantly, rotating (changing) every credential the file contained.
Recommended fix: don't commit it. Move the file somewhere outside the project folder, ideally into a password manager or secrets vault. Add a `docs/*credential*` rule to `.gitignore` as a backup safeguard. If it was ever committed on any branch in the past, rotate every credential inside it immediately.
Regression risk: Low.
Testing required: confirm `git status` and `git check-ignore` no longer show this file as something that could be accidentally committed.

**F23: No check that required settings exist when the server starts**
Severity: MEDIUM · Priority: P2
Location: `main/backend/server.js:1-70`
The problem: the secret key used to sign login tokens (`JWT_SECRET`) and the email server settings are only read at the moment they're actually needed (`authController.js:57,125`; `utils/mailer.js:10`), with nothing checking for them when the server first starts up. Only the Firebase (database) credentials are checked at startup, and even then there's a fallback to a local test version.
Why it matters: a deployment that's missing `JWT_SECRET` will start up successfully and appear to be working, only to fail the moment someone actually tries to log in, when the code that signs the token throws an error. This turns a simple configuration mistake into a live production incident instead of catching it immediately at deploy time.
Recommended fix: add a startup check that stops the server immediately with a clear error if `JWT_SECRET` (and the email settings, if email features are required) aren't set.
Regression risk: Low.
Testing required: start the server with `JWT_SECRET` deliberately unset and confirm it now fails immediately with a clear message, instead of starting normally.

**F24: No health check that actually verifies the database, and no graceful shutdown**
Severity: LOW · Priority: P3
Location: `main/backend/server.js:48,65-68`
The problem: the only existing "health check" endpoint just returns a fixed message with no check of whether the database is actually reachable. There's also no handler for the shutdown signal servers receive during a restart, meaning in-flight requests aren't given a chance to finish (this doesn't apply to Vercel-based deployments, which handle this differently).
Why it matters: monitoring tools can't tell the difference between "the process is running" and "the process is running but the database is down." And a rolling restart on a traditional server would cut off requests mid-flight instead of letting them complete.
Recommended fix: add a proper `/healthz` route that does a lightweight database check and reports whether it's using the real database or a local test version. Add a shutdown-signal handler that calls `server.close()` to drain in-flight requests, for any deployment that isn't on Vercel.
Regression risk: Low.
Testing required: check the health endpoint both with the database up and deliberately down; send a shutdown signal mid-request and confirm it completes gracefully.

### Architecture (how the code is organized)

**F01: `founderController.js` is a 951-line file doing far too many unrelated jobs**
Severity: MEDIUM · Priority: P2
Location: the whole file
The problem: one single file handles user management, audit logs, analytics and CSV export, global search, activity timelines, the dashboard, SLA policies and compliance, notification rules, permissions, and department management, all at once, mirroring an equally overloaded 94-line routes file.
Why it matters: changing any one of these unrelated features means touching a massive shared file, which increases the odds of conflicting changes and makes code review much harder.
Recommended fix: split it into separate, focused files: a user-management controller, an analytics controller, an SLA controller, a notifications controller, a departments controller, and a permissions controller, with a matching split in the routing file.
Regression risk: Medium.
Testing required: after splitting, test every founder and superadmin feature by hand to confirm nothing was dropped or miswired in the process.

**F02: `hrController.js` and `itController.js` were copy-pasted and are already drifting apart**
Severity: MEDIUM · Priority: P2
Location: `main/backend/controllers/hrController.js` (294 lines) versus `itController.js` (298 lines)
The problem: the functions to create, list, search, update status, update fields, and delete complaints, along with a shared duration calculator and a user-role lookup helper, are structurally identical between the two files, aside from the collection name and a few IT-only fields.
Why it matters: any bug fix has to be applied twice, by hand, and the two files have already started to diverge (IT gained some department-lookup logic and extra fields that HR doesn't have).
Recommended fix: extract one shared factory function that both HR and IT routing files can use, passing in just the collection name and any extra fields needed.
Regression risk: Medium.
Testing required: after the refactor, test creating, listing, searching, updating, and deleting complaints for both HR and IT to confirm both still behave identically to before.

**F11: `DashboardPage.jsx` is a 1,317-line file containing 5 entire nested views**
Severity: MEDIUM · Priority: P2
Location: the whole file, with nested sections starting around lines 45, 176, 598, 765, and 886
The problem: the data-request view, the assets view, the reports view, the "add a render" popup, and the rendering-status view are all defined as separate components nested inside one single page file, with real business logic like asset creation and report generation built directly into them.
Why it matters: this makes the file hard to navigate, hard to split into smaller loadable chunks, and hard to test each view on its own. The same pattern shows up on a smaller scale in two other files as well.
Recommended fix: pull each nested view out into its own file, then import them all into `DashboardPage.jsx`, which becomes just the page that assembles them together.
Regression risk: Low.
Testing required: manually click through each tab of the IT dashboard after the split to confirm everything still works.

**F12: The same "load more results" pagination logic is copy-pasted across 3 different sections of the app**
Severity: MEDIUM · Priority: P2
Location: `TicketContext.jsx:101-154`, `ApprovalContext.jsx:32-64`, `TaskProjectContext.jsx:32-69`
The problem: the logic for tracking "is there more to load," "are we currently loading," and "load the next batch" is duplicated almost identically across three different parts of the app, each keeping its own separate copy of that tracking state.
Why it matters: fixing a bug in this logic means making the same fix three separate times, and any future feature that needs the same "load more" behavior is more likely to copy this pattern again than to reuse it.
Recommended fix: pull this logic out into one reusable helper that any section of the app can plug in, returning the items, whether there's more to load, and a function to load the next batch.
Regression risk: Low.
Testing required: confirm "Load More" still works correctly for tickets, approvals, and tasks after the change.

**F13: The number 200, used as a hard read limit, is typed out by hand 18 separate times across 9 files**
Severity: LOW · Priority: P3
Location: `founderController.js:65-66,809-813,860-862` and repeated across `assetController.js`, `taskProjectController.js`, `leaveController.js`, `securityController.js`, `hrController.js`, `itController.js`, `hrDeskController.js`, and `renderController.js`
The problem: the cap on how many database records get read at once is a plain number, `200`, retyped roughly 18 times instead of being defined in one place and reused.
Why it matters: changing this cap requires hunting down every instance by hand, risking a mismatch where some endpoints use the new value and others still use the old one.
Recommended fix: define a single named value like `UNPAGINATED_READ_LIMIT = 200` in one shared file, and have every other file import it from there.
Regression risk: Low.
Testing required: none beyond confirming the shared value is still 200 everywhere; this change shouldn't alter any actual behavior.

**F14: The navigation menu's permission list is manually kept in sync across 3 or more separate files**
Severity: MEDIUM · Priority: P2
Location: `main/frontend/src/context/PermissionsContext.jsx:10-58` (a list called `PAGE_REGISTRY`)
The problem: `PAGE_REGISTRY` hardcodes, by hand, which navigation items each role can see. A comment in the code itself admits it has to be "kept in sync by hand" with separate lists of navigation items living in several different layout files across the app.
Why it matters: adding, renaming, or removing a navigation item now requires updating two (or more) completely separate lists, with nothing automatically catching it if someone forgets one. A missed update could silently let someone access a page with no menu entry pointing to it, or show a menu item that permission rules would otherwise block.
Recommended fix: have those separate layout files pull their navigation items directly from `PAGE_REGISTRY` (or generate the registry from the layouts) so there's only ever one true source of this information.
Regression risk: Low.
Testing required: confirm the navigation menu and what each of the app's 5 roles can actually access still match correctly after consolidating.

### Performance

**F17: No caching around the dashboard's 11 database queries**
Severity: MEDIUM · Priority: P2
Location: `main/backend/controllers/founderController.js:605-684`
The problem: every time a Super Admin loads the dashboard, it fires off 11 database reads at once, 5 of which (covering users, IT complaints, HR complaints, assets, and SLA policies) are complete, unbounded scans, with no temporary caching of the results anywhere. This is despite two other parts of the codebase already having exactly this kind of short-term caching in place as an established pattern.
Why it matters: loading time and database cost both grow directly with the total number of records, and this happens to be the very first page a Super Admin sees, making it the single most-visited page in the app.
Recommended fix: add a short-lived cache (30 to 60 seconds) around the dashboard's combined results, matching the caching pattern already used elsewhere in the codebase, and switch any query that only needs a count to Firestore's dedicated counting feature instead of reading every record.
Regression risk: Low.
Testing required: confirm the dashboard's numbers stay reasonably accurate within that caching window, including right after creating a new user.

**F18: All 7 sections of app data load automatically on every single login**
Severity: MEDIUM · Priority: P2
Location: `main/frontend/src/App.jsx:79-96`, plus each section's own startup code
The problem: all 7 data-providing sections of the app wrap around the entire site rather than being limited to the pages that actually need them, and each one fetches its data the moment the app starts, regardless of what page the person actually lands on. For example, an IT staff member landing on the main Dashboard still triggers requests for Asset Management data and Rendering Status data, even if they never visit those pages in that session.
Why it matters: this slows down how quickly the app becomes usable right after logging in, and wastes backend resources fetching data for pages that may never be opened.
Recommended fix: only start fetching a section's data the first time something on screen actually needs it, rather than the moment the app loads, or delay fetching for pages the user hasn't navigated to yet.
Regression risk: Medium.
Testing required: confirm every page still shows fresh, correct data the first time it's visited, and that shared, continuously-updating views (like ticket queues) still start updating correctly.

**F19: The data table component always builds both a desktop and a mobile version of every table**
Severity: LOW · Priority: P3
Location: `main/frontend/src/components/DataTable.tsx:147-210`
The problem: both the full desktop table layout and the mobile card-list layout are created for every single row of data on every page, with only CSS (styling rules) deciding which one is actually visible.
Why it matters: every table across more than 10 pages of the app does twice the work building its content, even though the user only ever sees one version at a time.
Recommended fix: use a screen-size check to only build the layout that's actually going to be shown, or, if the current approach was a deliberate choice (for example, to avoid needing extra JavaScript), document that decision so it's clear it wasn't an oversight.
Regression risk: Low.
Testing required: confirm there's no visible flash or mismatch when the page first loads, and check that resizing the browser window between desktop and mobile widths still works correctly.

---

## 5. Scores (0 to 10, based on the evidence above)

| Area | Score | Why |
|---|---|---|
| **Security** | **5/10** | The foundation is solid: signed login tokens, role-based middleware, a separate permission matrix, rate-limited login, and account lockout are all in place. But the admin's "revoke session" and "force logout" tools don't actually take effect on the user's screen (F04/F06), a credentials file sits in the project folder without protection (F05/F09), the password re-check endpoint has no brute-force protection (F08), and one route has a genuine access-control gap (F07). |
| **Architecture** | **5/10** | The overall layering (of providers, middleware) is clean in concept, but there are two oversized "does everything" files (F01, F11), duplicated controller and pagination logic (F02, F12), a manually-synced list of navigation permissions with two competing sources of truth (F14), and repeated hardcoded numbers (F13). This is real maintainability debt to pay down, not a design that's fundamentally broken. |
| **Performance** | **5/10** | The same controller file has three separate instances of unbounded, uncached, full-collection scans (F03, F15, F17), plus a pattern of eagerly loading everything on login (F18) and a minor always-double-render cost (F19). It performs fine today at current data volumes, and will predictably get slower as the data grows. |

---

## 6. Production Readiness Checklist

- [ ] **No files containing credentials should sit in the project folder.** `docs/login-credentials.pdf` is present and not protected by `.gitignore` (F05)
- [ ] **Server-side session and token revocation should actually work end to end.** Force-logout and revoke-session don't currently kick a live user off their screen (F04, F06)
- [ ] **Every expensive operation should have a limit and/or a rate cap.** Analytics, the dashboard overview, and SLA compliance are all currently unbounded and unthrottled (F03, F15, F17)
- [ ] **List views should page through results consistently, without silently dropping records.** The founder's complaint-related endpoints are still capped at a flat 200 with no way to see more (F16)
- [ ] **Required settings should be checked when the server starts.** `JWT_SECRET` and the email settings currently only fail when they're actually used, not at startup (F23)
- [x] **Login should be rate-limited and protected by account lockout.** Confirmed present, via the existing rate limiter and lockout threshold in `authController.js`
- [x] **Role-based access rules should be applied consistently across routes.** Confirmed present on nearly every sensitive route (one gap remains: F07)
- [ ] **Sensitive secondary login endpoints should also be rate-limited.** `/verify-password` currently isn't (F08)
- [ ] **The interface shouldn't show a save as successful when it silently failed.** Ticket field edits can currently revert without warning (F20)
- [ ] **The health check should reflect real system status, and shutdown should be graceful.** The current health check is just a static message, with no shutdown handling (F24)
- [ ] **No oversized files or duplicated logic should be blocking safe, fast changes.** F01, F02, F11, F12, and F14 are all still open

---

## 7. Recommended Fix Plan

**Phase 1: Critical security and data risks**
F05 (the credentials PDF), F04 (missing response interceptor / stale session), F03 (the unbounded analytics scan)

**Phase 2: Session and login hardening**
F06 (server-side logout), F08 (rate-limit the password re-check), F10 (admin password-reset rules), F09 (the `.gitignore` safeguard)

**Phase 3: Authorization and access control**
F07 (the coordinator routes access gap)

**Phase 4: API and database correctness and scale**
F16 (founder complaint pagination), F15 (dashboard and SLA unbounded scans)

**Phase 5: Performance and caching**
F17 (dashboard overview caching), F18 (eager data loading on login), F19 (the double-rendered data table)

**Phase 6: QA and data integrity**
F20 (the silently-reverting ticket field edit), F21 (the swallowed leave-request error), F22 (the login form's validation)

**Phase 7: Architecture cleanup**
F01 (splitting `founderController`), F02 (merging the duplicated HR/IT controllers), F11 (breaking up `DashboardPage`), F12 (extracting the shared pagination helper), F14 (one source of truth for navigation permissions), F13 (extracting the shared limit constant)

**Phase 8: Production hardening**
F23 (startup-time settings check), F24 (a real health check plus graceful shutdown)
