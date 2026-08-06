# HR Dashboard Requirements

Source: handwritten HR requirements notes, organized into a feature list.

## Recruitment & Candidate Management
- Candidate sourcing from multiple job portals
- Store candidate details: Name, Contact Number, Email, Location, Experience, Skills
- Resume management
- Candidate tracking through every hiring stage
- Schedule interviews/meetings with candidates
- Store interview feedback after meetings

## Employee Management
- Employee profile management
- Employee attendance management
- Employee bank details
- Employee leave management
- Employee working hours calculation
- Employee task management

## Attendance
- Daily attendance
- Monthly attendance report
- Login time / Logout time
- Total working hours
- Attendance history

## Leave Management
- Apply Leave
- Approve/Reject Leave
- Leave Balance
- Leave History

## Interview & Meeting Management
- Schedule interviews
- Schedule HR meetings
- Meeting calendar
- Interview feedback
- Meeting history
- Meeting reminders

## Email Management
- Dashboard inbox for received emails
- Sent email history
- Email notifications
- New email alerts directly inside the dashboard (no need to open Gmail separately)

## Notifications
- New email notifications
- Interview reminders
- Meeting reminders
- Leave request notifications
- Attendance alerts
- Task notifications

## Task Management
- Assign tasks
- Track task status
- Due dates
- Task progress

## Activity Logs
Track all user activities such as:
- Login / Logout
- Attendance updates
- Leave requests
- Email sent/received
- Candidate added
- Interview scheduled
- Feedback submitted

## Reports & Analytics
- Recruitment reports
- Attendance reports
- Leave reports
- Employee reports
- Interview reports
- HR analytics dashboard

## Dashboard Overview
Display:
- Total Employees
- Active Employees
- Candidates
- Interviews Today
- Meetings Today
- Attendance Summary
- Pending Leaves
- Recent Notifications
- Recent Activities

## Authentication
- Login
- Signup
- Forgot Password
- Session Management
- Profile Management

## User Roles
- Super Admin
- HR Manager
- Recruiter
- Interviewer
- Employee

---

## Current implementation status

The live HR dashboard (`main/frontend/src/pages/hr/`) currently covers a trimmed
core subset, chosen because this company isn't running recruiting through the
portal today:

- Dashboard Overview (employee/attendance/leave stats + charts)
- Employee Management → Directory
- Attendance
- Leave Management

Everything else on this page — Recruitment/ATS, Interviews & Meetings, Email
Management, Task Management, Activity Logs, Reports & Analytics, and
multi-role auth (Super Admin/Recruiter/Interviewer) — is **not built yet**.
Recruitment, Interviews, Meetings, Tasks, Email, Feedback, Reports, and
Activity Logs were built once as UI-only mockups with dummy data and then
removed at the user's request to keep the dashboard scoped to core needs.
Treat this file as the backlog/roadmap if that scope expands later — the
removed pages' code is recoverable from git history (see commits touching
`main/frontend/src/pages/hr/`).
