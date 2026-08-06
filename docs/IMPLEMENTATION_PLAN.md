# Comprehensive Implementation Plan: All Pages, Role Suites & Workflows

> **Document Version**: 2.0  
> **Last Updated**: August 6, 2026  
> **Target Repository**: Fute Services Project Ticket Portal  
> **Scope**: Step-by-step implementation plan covering all pages across **Founder Suite**, **IT Service Desk**, **HRMS Operations**, **Project Coordinator Workspace**, and **Real-Time Team Collaboration Chat**.

---

## 1. System Architecture & Page Hierarchy Overview

The Enterprise Portal connects 5 role suites through shared authentication, unified state context, and a real-time collaboration engine:

```
                  ┌────────────────────────────────────────┐
                  │          Authentication Front Door     │
                  │        (/, /login, /signup)            │
                  └──────────────────┬─────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ Founder Suite    │       │ IT Service Desk  │       │ HRMS Suite       │
│ (/founder/*)     │       │ (/it/*)          │       │ (/hr/*)          │
└────────┬─────────┘       └────────┬─────────┘       └────────┬─────────┘
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
       ┌────────────────────┐               ┌───────────────────┐
       │ Coordinator Suite  │               │ Slack/Discord Chat│
       │ (/coordinator/*)   │               │ Drawer Component  │
       └────────────────────┘               └───────────────────┘
```

---

## 2. Step-by-Step Page Implementation Specifications

### Phase 1: Authentication & Navigation Shell
- **[MODIFY] [LoginPage.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/LoginPage.jsx)**:
  - Multi-role Quick Demo Sign-in for **Founder**, **HR Manager**, **IT Engineer**, **Project Coordinator**, and **Employee**.
  - Direct role-based redirection (`/founder/dashboard`, `/hr/overview`, `/it/dashboard`, `/coordinator/overview`).
- **[MODIFY] [SignupPage.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/SignupPage.jsx)**:
  - Employee self-service registration form with department selection (Sales, Marketing, HR, IT, Engineering, Finance).

---

### Phase 2: Founder Executive Governance Suite
- **[NEW] [FounderDashboardPage.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/FounderDashboardPage.jsx)**:
  - **Header Bar**: Brand header, Notifications (3), Inbox Mail (2), Calendar Date Pill, Founder Profile Pill with Sign-out, **Team Chat** trigger.
  - **Top 6 Key Stat Cards**: Total Employees (`346`), Candidates (`128`), Open IT Tickets (`23`), Pending Approvals (`12`), Attendance Today (`87%`), IT Engineers Online (`15`).
  - **HR Overview Split Card**: 6 HR metrics + `Go to HR Dashboard →` navigation.
  - **IT Overview Split Card**: 6 IT metrics + `Go to IT Dashboard →` navigation.
  - **Today's Schedule Timeline**: Scheduled meetings & interviews + `View Full Calendar` link.
  - **Analytics Row**: Weekly Attendance Bar Chart, Recruitment Funnel, IT Tickets Donut Chart, System Alerts Panel.
  - **Founder Quick Actions**: Add Employee, Add Candidate, Raise IT Ticket, Approve Request, Schedule Meeting, Generate Report.

---

### Phase 3: IT Service Desk & Infrastructure Suite
- **[MODIFY] [DashboardPage.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/DashboardPage.jsx)**:
  - **`dashboard` Tab**: Zero-scroll single viewport overview, 6 Stat Cards, Tickets by Category Donut, Tickets by Status Donut, Assets Overview grid, Server Maintenance schedule.
  - **`tickets` Tab (`TicketsQueueView`)**: Full ticket queue table, category/status filters, priority tags (`Low`, `Medium`, `High`, `Critical`), issue resolution controls.
  - **`approval` Tab (`ApprovalCenterView`)**: Pending IT hardware/software requests, 1-click Approve/Reject buttons.
  - **`datarequests` Tab (`DataRequestsView`)**: Elevated Data Transfer requests log.
  - **`assets` Tab (`AssetsView`)**: Hardware asset inventory (Laptops, Desktops, Servers, Network, Printers).
  - **`reports` Tab (`ReportsView`)**: IT SLA Compliance & Resolution velocity logs.
  - **`settings` Tab (`SettingsView`)**: System configuration preferences.

---

### Phase 4: HRMS & Campus Recruitment Suite
- **[MODIFY] [Overview.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Overview.jsx)**:
  - Zero-scroll HR Overview, 6 Stat Cards, Candidate Pipeline Donut, Leave Overview Donut, Recent Candidates, Upcoming Interviews, Today's Events panels.
- **[MODIFY] [Directory.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Directory.jsx)**:
  - Employee directory grid & list view, department filters, search box, Employee profile drawer with bank details.
- **[MODIFY] [Candidates.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Candidates.jsx)**:
  - Recruitment pipeline kanban & list view, stage updates (`Applied` → `Joined`), resume source filter (`LinkedIn`, `Naukri`, `Referral`, `Campus Drive`).
- **[MODIFY] [Interviews.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Interviews.jsx)**:
  - Scheduled interviews calendar, meeting link launcher, interviewer notes.
- **[MODIFY] [Meetings.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Meetings.jsx)**:
  - Internal meetings calendar, Schedule Meeting modal.
- **[MODIFY] [Attendance.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Attendance.jsx)**:
  - Daily attendance percentage, present/absent logs, department attendance breakdown.
- **[MODIFY] [Leave.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Leave.jsx)**:
  - Leave requests table, Founder approval routing for HR/IT lead leaves (`isFounderApproval`).
- **[MODIFY] [Email.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Email.jsx)**:
  - Campus candidate inbox & template composer.
- **[MODIFY] [Feedback.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Feedback.jsx)**:
  - Interviewer evaluation ratings & candidate recommendation comments.
- **[MODIFY] [Reports.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Reports.jsx)**:
  - Headcount growth, hiring velocity, and monthly HR analytics.
- **[MODIFY] [ActivityLogs.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/ActivityLogs.jsx)**:
  - System audit log tracking all user actions, IP addresses, and timestamps.

---

### Phase 5: Project Coordinator & Developer/Designer Suite
- **[MODIFY] [Overview.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/coordinator/Overview.jsx)**:
  - Active project cards, progress bar indicators, team member assignments.
- **[MODIFY] [Tasks.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/coordinator/Tasks.jsx)**:
  - Task board, priority tags, Figma design asset link drops, GitHub PR code commit links.

---

### Phase 6: Real-Time Team Collaboration Suite
- **[NEW] [TeamChatDrawer.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/TeamChatDrawer.jsx)**:
  - Slack/Discord-style slide-over drawer accessible from header bar across all views.
  - Public & Department channels (`#general`, `#it-support`, `#hr-announcements`, `#project-coordination`).
  - Direct 1-on-1 messaging.
  - Ticket and asset embedding, file attachments, and real-time message sending.

---

## 3. Verification & Build Validation

- **Automated Verification**: Run `npm run build` inside `main/frontend` to ensure **0 syntax, JSX, or bundling errors**.
- **Cross-Role Testing**:
  1. **Multi-Dept Ticket Flow**: Log in as Employee → Raise Ticket → Verify instant push to IT Queue (`/it/dashboard`) and `#it-support` chat.
  2. **Founder Permission Flow**: Log in as IT/HR → Request Data Transfer / Elevated Leave → Log in as Founder (`/founder/dashboard`) → Verify notification & 1-click Approve/Decline.
  3. **HR Operations Flow**: Log in as HR (`/hr/overview`) → Add Candidate → Move Stage → Schedule Interview → Verify calendar update.
  4. **Coordinator Flow**: Log in as Coordinator (`/coordinator/overview`) → Create Project Task → Attach Figma Link → Verify progress update.
  5. **Team Chat Flow**: Click "Team Chat" in header → Switch channels → Post message → Verify instant channel feed render.
