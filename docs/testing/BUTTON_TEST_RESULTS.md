# Button / Interaction Test Results — Live UI QA Pass (2026-09-05)

| Control | Location | Result |
|---|---|---|
| "Let's go!" (login submit) | Login page | Works — correctly authenticates and redirects to the role-specific dashboard for HR, Employee, and IT accounts. |
| Sidebar nav items (Dashboard, Tickets Queue, Approval Center, Directory, Candidates, Interviews, Attendance, Email, Reports, Templates) | HR dashboard | All navigated to the correct route and rendered content. |
| "Add Employee" | HR Directory | Opens modal with full employee form (name, department, designation, email, contact, manager, status, DOJ, probation, employment type, etc.). Closed via the X button without submitting — no unintended data created. |
| "Raise IT Ticket" | Employee dashboard | Opens "Raise IT Support Ticket" modal (category/subcategory dropdowns, employee ID, priority, role, title, description). Submitted a `QA-TEST-` marked ticket — created successfully, confirmed by toast and updated dashboard counters. |
| "Create Ticket" (modal submit) | Raise IT Ticket modal | Works — shows success toast "IT Ticket raised", closes modal, increments Total Tickets / In Progress counters on the dashboard. |
| Ticket status dropdown (IT Dept Status) | IT Tickets Queue | Works — changing status from OPEN to CLOSED updates the row and fires an "→ Closed" toast with an Undo action. |
| Sign out | HR, Employee, IT profile menus | Works in all three roles — correctly clears the session and returns to the login page. |
| Status filter tabs (All/Open/In Progress/Waiting Approval/Resolved/Closed) | IT Tickets Queue | Open/Resolved/Closed tab counts update correctly, but the "All" tab does not — see BUGS_FOUND.md. |

## Not exercised this pass
Candidates, Interviews, Attendance, Email, Reports, and Templates sections (HR); My Tasks (Employee); Approval Center, Data Requests, Asset Management, Reports & Logs, Rendering Status (IT) were visited only by nav-click smoke test where noted in PAGE_TEST_RESULTS.md, not deep-tested button-by-button, due to the session's login-rate-limit budget (max ~3 fresh logins per test window).
