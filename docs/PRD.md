# PRD — Product Requirements Document
# Fute Services — Project Ticket Portal

> Reflects the application as it actually exists in this repository today, not the original v1 complaint-token concept. Verified against the live codebase (routes, contexts, mock data) rather than carried forward from earlier drafts.

---

## 1. Product Overview

The **Fute Services Project Ticket Portal** is an internal, role-based operations platform for a single company. One login screen routes each user into a dashboard suited to their role: raising and resolving IT/HR issues, running HR operations, coordinating projects and tasks, or getting an executive view across every department — including an AI-driven "Cabinet" that can be asked, in plain language, what's going on across the company right now.

## 2. Goals

- One login experience for five distinct roles, each landing on its own dashboard.
- Employees can raise an IT ticket and track it to resolution without leaving their dashboard.
- HR runs recruitment, interviews, attendance, employee directory, leave, and internal email from one workspace.
- IT runs a ticket queue, an approval center for elevated requests, data-transfer requests, and asset tracking.
- A Coordinator manages projects and tasks shared with the people actually doing the work.
- The Founder sees every department at a glance, approves cross-department requests, and can query an AI Cabinet of department personas for a live status summary.

## 3. User Roles

| Role | Landing route | Description |
|------|----------------|-------------|
| **Employee** | `/employee/dashboard` | Raises IT tickets, tracks their own tickets and tasks. |
| **HR** | `/hr/overview` | Manages recruitment, interviews, attendance, directory, email, and reports. |
| **IT** | `/it/dashboard` | Manages the ticket queue, approval center, data requests, and assets. |
| **Coordinator** | `/coordinator/overview` | Manages projects and tasks across the team. |
| **Founder** | `/founder/dashboard` | Full cross-department visibility, approvals, and the AI Cabinet. |

Role is derived from the account, not chosen at login — see [BACKEND_WORKFLOW.md](./BACKEND_WORKFLOW.md) for how registration detects it from an email pattern.

## 4. Features by Role

### 4.1 Authentication
- One login form for every role (`/`); the account's role decides where it lands.
- Demo/offline mode: five seeded demo accounts let anyone try every role without a live backend (see [BACKEND_WORKFLOW.md](./BACKEND_WORKFLOW.md) §7).
- "Remember me" controls whether the session survives closing the browser.
- Forgot-password is shown disabled — there is no reset endpoint yet.

### 4.2 Employee Dashboard
- Raise an IT ticket (category, sub-category, priority, department, description) via a validated form.
- "My Tickets" — every ticket the employee has raised, with live status.
- "My Tasks" — tasks and projects the employee is assigned to from the Coordinator's board.

### 4.3 IT Service Desk
- Ticket queue with status filters (`Open`, `In Progress`, `Waiting Approval`, `Resolved`, `Closed`); each ticket records Employee ID, Username, VPN No, and date, viewable in a per-ticket details drawer.
- Approval Center for requests that need Founder sign-off (software installs, system access, hardware procurement), with sort (newest/oldest), status, priority, and category filters.
- Data Transfer Requests (server-to-server) that route to Founder approval. Server 100 and Server 121 route to a named approver (Payel Ma'am / the Founder) instead of the standard queue; Servers 70/50/131 carry a standing tag (`Priority Wise` / `Tag Every Time` / `Standard Queue`). Requests are expandable to show requester contact, backup name, priority, and the routing outcome.
- Asset Management — laptops, desktops, servers, with warranty tracking, a dedicated Asset ID filter, and a per-asset audit drawer (component inventory, a components change log, and an allocation history) that a status or component edit appends to automatically.
- Reports & Logs — SLA compliance and resolution velocity.

### 4.4 Production Floor (interactive)
Unlike Sales, Developers, Marketing, and Branding — which stay read-only illustrative views — Production has a real, stateful dashboard:
- Log render jobs (project code, sequence type, frame range, systems allocated); frame-count and allocated-systems stat cards recompute live.
- Toggle a job between Rendering and Completed.
- "Report to IT" raises a real ticket straight into the shared IT ticket queue.

### 4.5 HR Operations
- Candidate pipeline: Applied → Screening → HR Round → Technical Round → Final Interview → Offer Sent → Joined / Rejected.
- Interview scheduling and status tracking.
- Attendance: daily snapshot plus a per-employee monthly history.
- Employee directory with department filtering.
- An in-app email workspace (inbox, sent, drafts, templates) scoped to HR correspondence.
- Reports: hiring, attendance, leave, interview, recruitment-source, and department-performance exports (CSV and a printable view).

### 4.6 Coordinator Workspace
- Projects: client, due date, team members, Figma/repo links, progress.
- Tasks: list and board views, grouped by status, assignable to any employee, with priority and due dates.
- A task a Coordinator assigns appears immediately on the assignee's Employee dashboard.

### 4.7 Founder Dashboard
- Cross-department overview: HR, IT, Sales, Developer, Marketing, Branding, Production summaries.
- Approval System: a unified queue for IT approvals and leave requests from HR/IT staff (see [BACKEND_WORKFLOW.md](./BACKEND_WORKFLOW.md) §5 for why those two leave categories route here instead of to HR).
- Project Details and cross-department Reports.
- **AI Agent Command Room** — a cabinet of five department personas (HR, IT, Coordinator, Employee-rep, Founder) that discusses a live snapshot of the dashboard data and answers a typed question. See [AI_WORKFLOW.md](./AI_WORKFLOW.md) for the full design.
- Team Chat Hub — company channels (`#general`, `#it-support`, `#hr-announcements`, `#project-coordination`) plus per-project channels.

### 4.8 Cross-cutting
- Dark theme only — no light mode or toggle.
- Responsive down to 390px — sidebars collapse to off-canvas drawers, tables reflow to cards.
- Every dashboard's data tables support sort, search/filter, and pagination.

## 5. Non-Functional Requirements

- Responsive design, desktop through mobile.
- Role-based access control enforced both client-side (route guards) and server-side (JWT + role middleware) for the endpoints that exist.
- Frontend deployed on Vercel; see [BACKEND_WORKFLOW.md](./BACKEND_WORKFLOW.md) for the current deployment gap.

## 6. Known Gap (as of this writing)

Only **login and registration** are wired to the real backend. Every other feature — tickets, leave, approvals, tasks/projects — currently lives in React Context state seeded from local mock data, so it resets on reload and isn't shared between users' browsers. The backend API and its Firestore-backed complaint model exist and are authorization-tested, but nothing in the UI calls them yet. This is documented in detail, with the reasoning and the path to closing it, in [BACKEND_WORKFLOW.md](./BACKEND_WORKFLOW.md) §6.

## 7. Out of Scope (current version)

- File/image attachment uploads.
- Password reset.
- Native mobile app.
- Persisting AI Cabinet conversations.
