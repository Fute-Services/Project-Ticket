# PRD: Product Requirements Document
# Fute Services: Project Ticket Portal

> This reflects the application as it actually exists in this repository today, not the original v1 complaint-token concept. It has been checked against the live codebase (routes, contexts, mock data) rather than carried forward from earlier drafts.

---

## 1. Product Overview

The **Fute Services Project Ticket Portal** is an internal, role-based operations platform for a single company. There is one login screen, and it routes each person into the dashboard suited to their role: raising and resolving IT/HR issues, running HR operations, coordinating projects and tasks, or getting an executive view across every department. This includes an AI-driven "Cabinet" that can be asked, in plain language, what's going on across the company right now.

## 2. Goals

- One login experience for five distinct roles, each landing on its own dashboard.
- Employees can raise an IT ticket and track it through to resolution without leaving their dashboard.
- HR runs recruitment, interviews, attendance, the employee directory, leave, and internal email from one workspace.
- IT runs a ticket queue, an approval center for elevated requests, data-transfer requests, and asset tracking.
- A Coordinator manages projects and tasks shared with the people actually doing the work.
- The Founder sees every department at a glance, approves cross-department requests, and can ask questions to an AI Cabinet of department personas for a live status summary.

## 3. User Roles

| Role | Landing route | Description |
|------|----------------|-------------|
| **Employee** | `/employee/dashboard` | Raises IT tickets, tracks their own tickets and tasks. |
| **HR** | `/hr/overview` | Manages recruitment, interviews, attendance, the directory, email, and reports. |
| **IT** | `/it/dashboard` | Manages the ticket queue, the approval center, data requests, and assets. |
| **Coordinator** | `/coordinator/overview` | Manages projects and tasks across the team. |
| **Founder** | `/founder/dashboard` | Full cross-department visibility, approvals, and the AI Cabinet. |

A person's role comes from their account, it is not something they choose at login. See [BACKEND_WORKFLOW.md](./BACKEND_WORKFLOW.md) for how registration figures out the role from an email pattern.

## 4. Features by Role

### 4.1 Authentication (logging in and proving who you are)
- One login form for every role (`/`). The account's role decides where a person lands after signing in.
- Demo/offline mode: five seeded demo accounts let anyone try every role without a live backend server running (see [BACKEND_WORKFLOW.md](./BACKEND_WORKFLOW.md), section 7).
- "Remember me" controls whether a person stays logged in after closing the browser, or has to log in again next time.
- Forgot-password is shown on screen but disabled. There is no working password-reset feature yet.

### 4.2 Employee Dashboard
- Raise an IT ticket (category, sub-category, priority, department, description) using a form that checks the entries before submitting.
- "My Tickets": every ticket the employee has raised, with a live status.
- "My Tasks": tasks and projects the employee has been assigned by the Coordinator.

### 4.3 IT Service Desk
- A ticket queue with status filters (`Open`, `In Progress`, `Waiting Approval`, `Resolved`, `Closed`). Each ticket records the Employee ID, Username, VPN No, and date, and can be opened in a details panel for the full picture.
- An Approval Center for requests that need the Founder's sign-off (software installs, system access, hardware purchases), with sorting (newest/oldest) and filters by status, priority, and category.
- Data Transfer Requests (moving data from one server to another) that route to the Founder for approval. Server 100 and Server 121 route to a specific named approver (Payel Ma'am or the Founder) instead of the standard queue. Servers 70, 50, and 131 carry a standing label (`Priority Wise`, `Tag Every Time`, or `Standard Queue`). Each request can be expanded to show the requester's contact details, a backup contact name, the priority, and where it was routed.
- Asset Management: tracking laptops, desktops, and servers, including warranty dates, a filter by Asset ID, and a detailed history panel per asset (what components it has, a log of component changes, and who it's been assigned to over time). Any edit to a status or component is added to that history automatically.
- Reports and Logs: how well the team is meeting its service-level targets, and how fast tickets get resolved.

### 4.4 Production Floor (this one is interactive)
Unlike Sales, Developers, Marketing, and Branding, which are read-only sample views for demonstration purposes, Production has a real, working dashboard:
- Log render jobs (project code, sequence type, frame range, systems allocated). The frame-count and allocated-systems summary numbers update live as jobs change.
- Switch a job between Rendering and Completed.
- "Report to IT" creates a real ticket that lands directly in the shared IT ticket queue.

### 4.5 HR Operations
- A candidate pipeline that moves through these stages: Applied, Screening, HR Round, Technical Round, Final Interview, Offer Sent, and then either Joined or Rejected.
- Scheduling interviews and tracking their status.
- Attendance: a daily snapshot, plus a monthly history for each employee.
- An employee directory that can be filtered by department.
- An in-app email workspace (inbox, sent, drafts, templates) just for HR correspondence.
- Reports covering hiring, attendance, leave, interviews, where recruits came from, and department performance, exportable as CSV files or a printable view.

### 4.6 Coordinator Workspace
- Projects: client name, due date, team members, links to Figma or the code repository, and progress.
- Tasks: viewable as a list or a board, grouped by status, assignable to any employee, each with a priority and a due date.
- The moment a Coordinator assigns a task, it shows up immediately on that employee's own dashboard.

### 4.7 Founder Dashboard
- A cross-department overview: summaries from HR, IT, Sales, Developer, Marketing, Branding, and Production.
- Approval System: one combined queue for IT approvals and leave requests coming from HR/IT staff (see [BACKEND_WORKFLOW.md](./BACKEND_WORKFLOW.md), section 5, for why those two kinds of leave requests land here instead of going to HR directly).
- Project Details and cross-department Reports.
- **AI Agent Command Room**: a "cabinet" of five department personas (HR, IT, Coordinator, an Employee representative, and the Founder) that can discuss a live snapshot of the dashboard's data and answer a question typed in plain English. See [AI_WORKFLOW.md](./AI_WORKFLOW.md) for the full design.
- Team Chat Hub: company-wide channels (`#general`, `#it-support`, `#hr-announcements`, `#project-coordination`) plus a channel for each project.

### 4.8 Applies everywhere
- Dark theme only. There's no light mode or a switch to toggle between them.
- The layout adapts down to a screen width of 390 pixels (a small phone). Sidebars collapse into slide-out drawers, and tables reflow into stacked cards.
- Every data table across every dashboard can be sorted, searched or filtered, and paged through.

## 5. Non-Functional Requirements (things the product has to do well, not features you'd point to directly)

- The design has to work well from a desktop screen down to a phone.
- Role-based access control (making sure people can only do what their role allows) is enforced twice: once in the browser, so the interface hides things a role shouldn't see, and again on the server, using a signed login token (JWT) and role checks, for every endpoint that has that check in place.
- The frontend (what people see and click on) is deployed on Vercel. See [BACKEND_WORKFLOW.md](./BACKEND_WORKFLOW.md) for the current gap in how the backend (the server that stores and processes data) is deployed.

## 6. Known Gap (as of this writing)

At the time this document was last checked, only **login and registration** were fully connected to the real backend server. Every other feature (tickets, leave, approvals, tasks and projects) lived only in the browser's temporary memory, seeded from sample data, so it would reset on page reload and wasn't shared between different people's browsers. The backend API and its underlying database model existed and had been checked for correct permissions, but nothing in the visible interface called them yet. The reasoning behind this, and the plan to close the gap, is documented in [BACKEND_WORKFLOW.md](./BACKEND_WORKFLOW.md), section 6. (Note: much of this has since moved forward: HR and IT tickets, for example, are now connected to the real database. Treat this section as a historical snapshot rather than the current state; check the other docs in this folder for what's current.)

## 7. Out of Scope (current version)

- Uploading files or images as attachments.
- Resetting a forgotten password.
- A native mobile app.
- Saving AI Cabinet conversations for later.
