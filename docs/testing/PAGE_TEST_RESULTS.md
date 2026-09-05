# Page Test Results — Live UI QA Pass (2026-09-05)

Target: http://192.168.1.23 (on-prem Fute Portal deployment). Tested live in Chrome via browser automation, hands-on, not just API calls. Logins used (spaced to avoid the shared `authLimiter` 10-req/15min bucket on `/login`): `hr.test@futeservices.com` (HR), `test.employee@futeservices.com` (Employee), `system.it.test@futeservices.com` (IT).

| Page | Role | Loads? | Notes |
|---|---|---|---|
| `/` (login) | — | Yes | Renders correctly; email/password fields, "Remember me", error banner all functional. |
| `/hr/overview` | HR | Yes | Dashboard stat tiles (Total Employees, Attendance, Candidates, Interviews), Candidate Pipeline donut, HR Tickets panel, Recent Candidates, Upcoming Interviews all rendered with live data. HR Tickets panel content overflows/clips at this viewport width (see BUGS). |
| `/hr/approvals` | HR | Yes | Approval Center form (Send for Founder Approval) and Awaiting Founder Sign-off / Decision History panels render correctly. |
| `/hr/tickets` | HR | Yes | Tickets Queue table, status tabs (All/Open/In Progress/...), inline HR Dept Status dropdown, Approvals column all functional. |
| `/hr/directory` | HR | Yes | Employee Directory grid (39 employees), search, filter dropdown, "Add Employee" modal all working. |
| `/employee/dashboard` | Employee | Yes | Welcome banner, Check-in card, Total/In Progress/Resolved ticket tiles, Leave & Performance, Holidays, Recent Tickets Queue all rendered. |
| `/employee/tickets` (My Tickets) | Employee | Yes | Ticket list, status filter tabs, view/edit actions all present and functional. |
| `/it/dashboard` | IT | Yes | IT Service Desk stat tiles, Tickets by Category / by Status donuts, Assets Overview all rendered with live counts. |
| `/it/tickets` (Tickets Queue) | IT | Partially | Page loads and status-change dropdown works, but the "All" tab's count badge and list contents do not reliably reflect the true ticket total after a status change (see BUGS_FOUND.md). |

## Console errors
No JS console errors or exceptions were observed on any page visited in this pass (checked via the browser's console log, filtered for errors/exceptions).

## Responsive check
Attempted a mobile viewport check (390x844) via window resize on the Employee Directory page. The resize call succeeded but the rendered screenshot continued to reflect the prior desktop viewport dimensions — this is a limitation of the automation tooling used in this pass, not a confirmed app-side responsive bug. Genuine responsive/mobile-breakpoint testing of this app is still outstanding and should be redone with a tool that can reliably force a narrow viewport (e.g. real device, or DevTools device toolbar operated manually).

## Scope note
This pass covered 3 of the portal's roles (HR, Employee, IT) hands-on. Founder, Coordinator, Production, Sales, and Super Admin dashboards were not re-tested in this session (time/rate-limit budget); prior API-level testing in `API_TEST_RESULTS.md` already covers their backend behavior.
