# Bugs Found — Live QA Pass (2026-09-05)

Only one real defect worth tracking came out of this pass. Everything else exercised (role gates, CSRF, IDOR probes, self-delete/self-deactivate guards, validation, CRUD cycles) matched the documented behavior exactly — see `API_TEST_RESULTS.md` for the full pass/fail table.

---

### BUG-01: Shared rate-limit bucket across `/login`, `/register`, `/refresh`, `/verify-password` can strand a logged-in session

- **Status:** ✅ Fixed 2026-09-05 — `/refresh` now uses its own `refreshLimiter` (60 req/15min/IP) in `main/backend/routes/authRoutes.js`, separate from the 10 req/15min `authLimiter` still applied to `/login`, `/register`, and `/verify-password`.
- **Severity:** Medium
- **Endpoint(s):** `POST /api/auth/refresh`, `POST /api/auth/verify-password` (and indirectly `/login`, `/register`)
- **Steps to reproduce:**
  1. From one IP, perform several login attempts in a short window (e.g. a user mistyping their password a few times, or — as happened during this test run — a QA/automation script logging in as 8 different demo accounts back to back).
  2. Once 10 requests to any of `/login`, `/register`, `/refresh`, `/verify-password` have been made from that IP within 15 minutes, `authLimiter` starts rejecting **all four** with `429 RATE_LIMITED` — including `/refresh`.
  3. Observed directly in this run: after 8 role logins + a handful of invalid-credential probes, the very next `/api/auth/refresh` call (with a perfectly valid, unexpired refresh cookie) and `/api/auth/verify-password` call both returned `429` instead of succeeding.
- **Expected result:** A user who is already logged in and simply needs their 15-minute access token silently refreshed (the normal, automatic flow described in `docs/07-authentication.md`) should not be blocked by unrelated login/register attempts from the same IP (e.g. a shared office NAT, or the same user mistyping their password on a different tab).
- **Actual result:** `/refresh` shares the same 10-req/15-min bucket as `/login` and `/register`. On a shared IP (common for an on-prem office deployment like this one — the login credentials doc's failed-login sample rows show internal IPs like `192.168.1.x`), enough login noise from other users/tabs can silently exhaust the bucket and cause `/refresh` to start failing for everyone on that IP. Per `docs/07-authentication.md`, the frontend's `api.js` interceptor calls `/refresh` automatically on any 401 — if refresh itself starts 429ing, the practical effect is the user gets logged out (or stuck retry-looping) even though their session was still valid.
- **Backend file:** `main/backend/routes/authRoutes.js` (`authLimiter` applied to `/register`, `/login`, `/refresh`, `/verify-password` — per `docs/04-api-documentation.md`'s rate-limiting table).
- **Possible cause:** A single limiter instance/bucket keyed only by IP is reused across all four routes instead of scoping refresh (and verify-password) separately from the credential-guessing-prone login/register routes.
- **Recommended fix:** Give `/refresh` its own, more generous limiter (it's not a credential-guessing target — the refresh token is an unguessable opaque cookie value, not a password), or key the login/register limiter more precisely (e.g. per-email in addition to per-IP) so unrelated refresh traffic on the same NAT/office IP isn't starved. At minimum, exempt `/refresh` from the shared bucket, matching the reasoning already used to CSRF-exempt it (`docs/07-authentication.md`'s own rationale: refresh "takes no attacker-controlled input" and isn't a brute-force target the way login is).

---

## Explicitly not counted as bugs (documented in API_TEST_RESULTS.md, restated here to head off double-counting)

- **IT complaint `reopen` returning 403 instead of the test's expected 400** — this was a test-script error (the reopen call was made by a session that wasn't the ticket's owner), not an application defect. The ownership check correctly ran and blocked it.
- **`GET /api/founder/complaints` returning 403 for the `superadmin` account** — correct per docs (that route is gated to role `founder` specifically, not `superadmin`); the test's initial expectation was wrong, not the app.
- **HR-desk self-service endpoints (check-in/out, extra-hours) 400ing for the `test.employee` account** — that demo account has no linked HR employee record; the API correctly returns a clear `VALIDATION_ERROR` rather than crashing. This is a test-data gap, not a code defect.
- **Chat DM IDOR probe not completed** — blocked by our own rate-limit exhaustion (see BUG-01's own reproduction cause), not a finding about the DM access-control code itself. Needs a retest in a fresh rate-limit window; tracked as a follow-up in `API_QA_SUMMARY.md`, not as a bug.
