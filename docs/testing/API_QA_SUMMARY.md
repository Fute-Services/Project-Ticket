# API QA Summary — Live Backend Test Pass

**Date:** 2026-09-05
**Target:** `http://192.168.1.23:5000` (live self-hosted production backend)
**Scope:** API-level only (curl/Node HTTP requests, real auth flow, 8 real accounts across all 8 roles). No browser automation was used or attempted.

## Coverage

- **~58 of the 92 documented endpoints** exercised with at least one request; **89 individual test cases** run (normal, invalid-input, unauthorized, wrong-role, and full CRUD cycles where applicable).
- Not reached this pass (time/scope-bounded, not because anything looked risky): `POST /api/auth/register`, file-upload endpoints (`hr-desk` documents, `sales-desk/leads/import`), CSV export endpoints (`analytics/export`, `email-campaign/export`), `document-templates` CRUD, most `hr-desk` `makeCrud` resources beyond `candidates` (interviews, meetings, feedback, jobs, performance, leave-entries), `notification-rules`, `action-permissions`, `system-settings`, `dashboard-layout`, `activity-timeline`, `search`, `sla-compliance`, session-revoke/force-logout/unlock endpoints, and the chat DM channel (see below).

## Results

| | Count |
|---|---|
| PASS | 80 |
| Inconclusive — our own rate-limit burst, not an app defect | 5 |
| Test-script wording errors (corrected in docs, not app bugs) | 2 |
| Environment/data-gap findings (not app bugs) | 6 |
| **Real bugs filed** | **1** |

## Bug counts by severity

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 0 |
| Medium | 1 |
| Low | 0 |

Full detail: `BUGS_FOUND.md`.

## Top issues to fix first

1. **BUG-01 (Medium):** `/api/auth/refresh` and `/api/auth/verify-password` share the same 10-req/15-min rate-limit bucket as `/login` and `/register`. On a shared office IP, unrelated login noise can starve a legitimate user's silent token refresh, effectively forcing them to log in again. Recommend giving `/refresh` its own limiter or exempting it, since it isn't a credential-guessing target (see `BUGS_FOUND.md`).
2. **Follow-up, not a confirmed bug:** the chat DM-channel IDOR check (`only the two participants may read/post a dm-* channel`) was not independently verified this pass — our own test traffic tripped the rate limiter above before the follow-up script could log in. Recommend a short, standalone retest (2 logins + 2 requests, well under any limit).
3. **No code changes needed for anything else observed.** Every role gate, CSRF check, IDOR probe on complaint fields, self-delete/self-deactivate guard, and input-validation case tested matched documented behavior exactly, with clean 400/401/403/404/409 responses and no 500s or unhandled exceptions anywhere in this pass.

## Data safety / cleanup

All created test records were prefixed `QA-TEST-1788584443085`. Records with a DELETE endpoint were deleted at the end of the run and verified gone via a follow-up GET:

- HR complaint (created → verified → deleted → confirmed 404 on re-search)
- IT complaint (created → status-transitioned → deleted, cascade-deleted its linked approval)
- IT asset `QA-TEST-ASSET-1788584443085` (created → updated → deleted)
- Sales lead `QA-TEST-1788584443085 Company` (created → updated → call logged → deleted)
- Sales campaign `QA-TEST-1788584443085 Campaign` (created → deleted)
- Department `QA-TEST-1788584443085 Dept` (created → deactivated → deleted)
- Superadmin-created user `qa-test-1788584443085@futeservices.com` (created → updated → permissions changed → deactivated → password reset → deleted)

**Records left behind — no DELETE endpoint exists for these resource types in the documented API, so they require a manual database cleanup (or a future DELETE endpoint) rather than an API call:**

| Resource | Identifier | Owner account | State |
|---|---|---|---|
| Leave request | `eVbxkrKoiO6dDev1rtGy` | test.employee@futeservices.com | Approved, reason `QA-TEST-1788584443085 leave` |
| Coordinator task | `qaAKrcVn9p4cm1nLIW7h` | assignee "Test User" | Done, title `QA-TEST-1788584443085 task` |
| Production render | `HnoWZVfx5Fu21xbHrJ9F` | — | Done, personName `QA-TEST-1788584443085 Person` |
| Approval (document) | `FgpAHoOCDUU5XE6PQPsu` | requested by IT Tester | Approved, title `QA-TEST-1788584443085 approval` |
| Approval (extra-hours) | `KoAltFx2ZwTOsULVaUEy` | requested by IT Tester | Approved, title `QA-TEST-1788584443085 extra-hours approval` |
| Chat message | id `UEhAcIFEU2VUitveqaKF` in the `general` channel | test.employee@futeservices.com | Text: `QA-TEST-1788584443085 hello` |

All six are clearly marked with the `QA-TEST-1788584443085` prefix for easy identification and manual deletion directly in MongoDB by whoever owns that access; none affect any pre-existing real employee/ticket/lead data.

## Explicit note on scope

**UI/browser-level testing (buttons, forms, modals, console, network tab, responsive behavior) was NOT performed in this pass.** This was an API-only pass per the assigned scope, pending browser tool availability for a follow-up UI-focused QA session.
