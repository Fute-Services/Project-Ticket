# Performance Results — Live QA Pass (2026-09-05)

Response times captured client-side (round-trip, single sequential requests from one Node process, no concurrency) against `http://192.168.1.23:5000`. This is indicative only — not a load test.

## Headline numbers

- **Fastest:** simple GETs on cached/small collections — 4-12ms (e.g. `GET /api/auth/me`, role-gate 403 rejections, `GET /healthz` at 14ms with a 3ms Mongo ping).
- **Slowest observed:** 654ms (`POST /api/founder/departments` — superadmin creates a department) and 588ms (`POST /api/sales-desk/campaigns` — create campaign). Both still **under the 1-second threshold** called out in the task, but notably the outliers among ~90 requests.
- **No request exceeded 1 second.** No timeouts, no hangs.
- **Typical write (POST/PATCH/DELETE) latency:** 80-260ms — consistent with an on-prem MongoDB with no external network hop.
- **Typical read (GET) latency:** 4-20ms.

## Notable timings (all values from this run)

| Endpoint | Operation | ms | Note |
|---|---|---|---|
| `POST /api/founder/departments` | create | 654 | Slowest call observed this pass — see note below |
| `POST /api/sales-desk/leads/import`-adjacent: `POST /api/sales-desk/campaigns` | create | 588 | Second-slowest |
| `POST /api/founder/users` | create user | 426 | Password hashing (bcrypt) expected to dominate here |
| `PATCH /api/founder/users/:uid/reset-password` | reset password | 332 | Also bcrypt-bound, expected |
| `POST /api/auth/login` | login (×8, avg) | ~250-266 | Consistent across all 8 role logins — bcrypt compare + session creation, expected and acceptable for an auth endpoint |
| `PATCH /api/founder/users/:uid/active` | deactivate | 263 | |
| `DELETE /api/founder/users/:uid` | delete | 263 | |
| `PATCH /api/founder/departments/:id` | update | 180 | |
| `DELETE /api/founder/departments/:id` | delete | 200 | |
| `PATCH /api/founder/users/:uid` | update | 179 | |
| `PATCH /api/it/complaints/:id/status` (→ Waiting Approval, triggers a Mongo transaction) | status transition | 171 | Transaction overhead visible but reasonable |
| `PATCH /api/coordinator/tasks/:id/status` / `:id` | update | ~161-162 | |
| Most other POST/PATCH/DELETE (complaints, leads, assets, approvals, leave, tasks, renders) | | 77-152 | Consistent range |
| All GET list/detail endpoints (complaints, assets, leads, staff, directory, analytics, dashboard-overview, audit-logs, sessions, sla-policies, etc.) | | 4-20 | Consistently fast |

## Interpretation

- The two calls over 500ms (`departments` create, `campaigns` create) are both **create** operations and both were early/isolated single calls, not part of a sustained slow pattern (their own list/update/delete counterparts on the same resources ran in the normal 90-200ms band). This reads as normal one-off variance (e.g. a cold connection pool slot, first write to a fresh collection) rather than a systemic issue — but if departments or campaigns creation is reported as slow by real users, it's worth a second look with server-side timing/logging.
- Password-hashing-bound endpoints (login, register-equivalent user creation, password reset) sitting at 250-430ms is expected bcrypt cost and not a concern.
- The `/api/it/complaints/:id/status` transition into `Waiting Approval` — which runs a multi-document MongoDB transaction per `docs/04-api-documentation.md` — added no material overhead (171ms, in line with other single-document writes).
- No endpoint showed pathological latency (>1s) or a timeout in this pass. Cached/rate-limited founder endpoints (`dashboard-overview`, `analytics`) responded quickly (12-20ms) — the documented 30s cache appears effective.

## Not measured this pass

- Concurrent/load behavior (only sequential single-client requests were made, deliberately, to avoid impacting the live production server).
- Large-payload operations: `POST /api/sales-desk/leads/import` (xlsx upload), `POST /api/hr-desk/employees/:id/documents/:docType` (file upload), `GET /api/founder/analytics/export` (CSV export), `GET /api/sales-desk/email-campaign/export` (CSV) — none of these were exercised in this pass (see `API_QA_SUMMARY.md` for full coverage gaps).
