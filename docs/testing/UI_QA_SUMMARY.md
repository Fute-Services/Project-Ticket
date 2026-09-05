# UI QA Summary — Live Pass (2026-09-05)

**Target:** http://192.168.1.23, live hands-on browser testing (not API-only). Credentials from `docs/Fute_Portal_Login_Credentials.pdf`.

**Roles tested:** HR (`hr.test@futeservices.com`), Employee (`test.employee@futeservices.com`), IT (`system.it.test@futeservices.com`). Kept to 3 fresh `/login` calls, spaced with in-between navigation, to stay well under the shared 10-req/15min `authLimiter` on `/login`, `/register`, `/verify-password`. No `429`s were hit during this session.

**Pages/flows verified:** Login, HR Overview/Approval Center/Tickets Queue/Directory (incl. Add Employee modal), Employee Dashboard/My Tickets (incl. full Raise-IT-Ticket create flow), IT Dashboard/Tickets Queue (incl. status-change flow). Full detail in `PAGE_TEST_RESULTS.md` and `BUTTON_TEST_RESULTS.md`.

**Bugs found:** 4, all UI-layer, none blocking. See `UI_BUGS_FOUND.md`:
1. IT Tickets Queue "All" tab shows a stale/wrong count and falls back to an empty-state message after a status change (Medium).
2. A toast notification leaks across sign-out into a different user's session (Low).
3. "Welcome,HR Tester" missing a space (Trivial/cosmetic).
4. HR dashboard "HR Tickets" panel status pills clip at desktop width (Low).

**Console/network:** No JS errors or exceptions observed on any visited page.

**Not covered this pass:** Founder, Coordinator, Production, Sales, and Super Admin dashboards (not re-visited hands-on; already covered at the API level in `API_TEST_RESULTS.md`); Candidates/Interviews/Attendance/Email/Reports/Templates deep interaction; and a reliable mobile/responsive check (tooling limitation, see `PAGE_TEST_RESULTS.md`).

**Data safety / cleanup:** One test ticket was created, prefixed `QA-TEST-` (`FT-IT-GIFKZR`, "QA-TEST- UI QA ticket creation check"), and closed via the IT dashboard before the session ended. No other data was created, modified, or deleted.
