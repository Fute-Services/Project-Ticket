# Security Test Results — Live QA Pass (2026-09-05)

Target: `http://192.168.1.23:5000`. All probes below used real accounts from `docs/Fute_Portal_Login_Credentials.pdf` and only touched `QA-TEST-1788584443085`-marked records.

## Auth bypass attempts

| Probe | Expected | Actual | Result |
|---|---|---|---|
| `GET /api/auth/me` with no cookie/token | 401 | 401 `UNAUTHORIZED` | Blocked correctly |
| `GET /api/sales-desk/leads` with no auth | 401 | 401 `UNAUTHORIZED` | Blocked correctly |
| Login with wrong password | 401 | 401 `INVALID_CREDENTIALS` | Blocked correctly |
| `POST /api/auth/refresh` with no refresh cookie | 401 | 429 (rate-limited before the auth check ran — see `BUGS_FOUND.md` BUG-01) | Inconclusive on the specific check, but no bypass occurred either way |

No route tested returned data or accepted a mutation without a valid session cookie.

## CSRF bypass attempts

| Probe | Expected | Actual | Result |
|---|---|---|---|
| `POST /api/hr/complaints` with a valid session cookie but **no** `X-CSRF-Token` header | 403 `CSRF_INVALID` | 403 `CSRF_INVALID` | Blocked correctly — double-submit check holds |

Only one state-changing request was deliberately sent without the CSRF header (further probes were unnecessary once the mechanism was confirmed working, and would have burned more of the shared rate-limit budget). The double-submit design (non-httpOnly `fute_csrf` cookie + required header/body echo) matches `docs/07-authentication.md` and functioned as documented.

## Role-check bypass attempts

14 wrong-role probes were run across nearly every protected resource family (HR, IT, sales-desk, leave, coordinator, IT assets, hr-desk, founder/superadmin, SLA policies, security center) — full table in `API_TEST_RESULTS.md`. **Every single one returned 403 `FORBIDDEN` as expected.** Notably:

- `founder` (a real, distinct role) could **not** reach superadmin-only routes (`/api/founder/users`, `DELETE /api/founder/users/:uid`, `/api/founder/security/failed-logins`) — confirms `founder` and `superadmin` are correctly treated as separate authorization tiers, not aliases.
- `hr` could not decide an `extra-hours`-category approval (founder-only by category, per `docs/04-api-documentation.md`'s `HR_DECIDABLE_CATEGORIES`) — got 403 with a specific message (`"Only the founder can decide this approval"`), not a generic failure or a silent success.
- `sales` could not read `/api/hr-desk/attendance/me/today` (not in that route's allow-list) — 403 as expected.

No role-check bypass was found.

## IDOR (Insecure Direct Object Reference) checks

| Probe | Expected | Actual | Result |
|---|---|---|---|
| A `sales` user (not the ticket owner, not hr/founder/superadmin) attempts `PATCH /api/hr/complaints/:id/fields` on an `employee`-owned ticket | 403 | 403 `Forbidden: Insufficient permissions` | Blocked correctly |
| Anonymous request to `/api/sales-desk/leads` (object listing, no auth) | 401 | 401 | Blocked correctly |
| Chat DM channel: a non-participant reading/posting into someone else's `dm-<uidA>-<uidB>` channel | 403 expected per docs | **Not completed** — blocked by our own auth-route rate-limit exhaustion before the second test script could log in | **Untested this pass — flagged as a follow-up, not a confirmed pass or fail** |

The one IDOR surface most worth re-checking (DM channel access) could not be exercised due to the rate-limiting side effect described in `BUGS_FOUND.md` BUG-01. Recommend a short, standalone retest (2 logins, 1 DM resolve, 1 cross-account read attempt — well under any rate limit) once the 15-minute window from this run has cleared.

## Missing validation checks

All tested endpoints returned clean `400 VALIDATION_ERROR` responses for missing/malformed required fields rather than crashing or returning a 500:

- `POST /api/auth/login` missing password → 400
- `POST /api/hr/complaints` missing fields → 400
- `POST /api/it/complaints` missing IT-required `category` → 400
- `POST /api/it/assets` with an id containing spaces/`!` → 400, with a specific message about the allowed character set
- `POST /api/it/assets` with a duplicate id → 409 `ASSET_ALREADY_EXISTS` (correct conflict code, not a crash)
- `POST /api/sales-desk/leads` missing `companyName` → 400
- `POST /api/sales-desk/leads/:id/log-call` missing `outcome` → 400
- `POST /api/chat/:channelId/messages` with empty text → 400
- `POST /api/hr-desk/candidates` missing `email` → 400

No unhandled exceptions or 500s were triggered by any malformed-input probe in this pass.

## Self-protection guards (superadmin)

| Probe | Expected | Actual | Result |
|---|---|---|---|
| Superadmin attempts to deactivate their own account | Blocked | 400 `"Can't deactivate your own account"` | Correct |
| Superadmin attempts to delete their own account | Blocked | 400 `"Can't delete your own account"` | Correct |

Both guards fired correctly, preventing accidental/malicious self-lockout.

## Rate limiting behavior

- **Confirmed active:** the shared `authLimiter` (10 req/15 min/IP across `/login`, `/register`, `/refresh`, `/verify-password`) tripped during this very test run after our own burst of 8 role logins plus a few invalid-credential probes — every subsequent call to those four routes returned `429 RATE_LIMITED` for the rest of the window, including a legitimate refresh with a valid cookie.
- This confirms the limiter **works** (it does throttle), but its shared-bucket scope is flagged as a design concern in `BUGS_FOUND.md` (BUG-01), since it can incidentally block routine, non-attack traffic like a silent token refresh.
- The global rate limiter (300 req/15 min/IP, `server.js`) was not exhausted or specifically probed to avoid degrading the live server for real users during business hours.

## Overall

No auth bypass, no CSRF bypass, no role-check bypass, and no confirmed IDOR were found. The one gap is the untested chat DM IDOR check, which is a coverage gap from this pass rather than a known weakness — recommend a quick standalone retest.
