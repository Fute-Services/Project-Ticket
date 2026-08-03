# PRD — Product Requirements Document
# Fute Complaint Token Generation Portal

---

## 1. Product Overview

The **Fute Complaint Token Generation Portal** is an internal web application for Fute company members to raise, track, and manage complaints or queries directed to the **HR** or **IT** department. Every complaint generates a unique alphanumeric token that can be used to track its status.

---

## 2. Goals

- Allow all Fute employees to raise complaints to HR or IT from a single account.
- Auto-generate a unique token per complaint for tracking.
- HR and IT departments manage and update their respective complaints.
- Founders have full visibility and control over all complaints across both departments.
- Email notifications keep all parties informed.

---

## 3. User Roles

| Role | Description |
|------|-------------|
| **Employee** | Any Fute member. Can raise complaints to HR and/or IT. Can view own complaints and track by token. |
| **HR Staff** | Email pattern: `hr.fute` (e.g. `hr.fute2@gmail.com`). Manages HR complaints. Can also raise IT complaints. |
| **IT Staff** | Email pattern: `system.fute` or `system.futeservice` (e.g. `system.futeservice@gmail.com`). Manages IT complaints. Can also raise HR complaints. |
| **Founder** | Manually assigned in DB. Full access to all complaints (HR + IT). Can update any complaint. |

---

## 4. Features

### 4.1 Authentication
- Email + Password login via Supabase Auth.
- Only Fute domain emails or manually approved emails can register.
- Role auto-detected from email pattern; Founder role assigned manually in DB.
- Separate login pages for Employee, HR, IT — same UI, role-based routing after login.

### 4.2 Employee Portal
- Dashboard showing all submitted complaints (HR + IT) with token numbers.
- Raise complaint to HR department.
- Raise complaint to IT department.
- Token shown immediately after submission.
- Search complaint by token number (logged-in only).
- Email notification when complaint status is updated.

### 4.3 HR Complaint Form Fields

| Field | Type | Notes |
|-------|------|-------|
| Name | Text | Employee full name |
| Department | Dropdown | Development, Design, Architecture, Sales, Marketing, Operations, HR, IT |
| Description | Textarea | Detailed complaint/query |
| Date of Complaint | Date Picker | When the issue started |
| Duration | Auto-calculated | From complaint date to now (e.g. "2 days 3 hours") |
| Current Time | Auto | System timestamp at submission |
| Priority | Dropdown | P1 (High), P2 (Medium), P3 (Low) with hover tooltip |
| Status | Dropdown | In Progress, Completed, Pending |

### 4.4 IT Complaint Form Fields

| Field | Type | Notes |
|-------|------|-------|
| Name | Text | Employee full name |
| Department | Dropdown | Same as HR |
| Category | Dropdown | Software, Laptop/Device, Desktop, Storage, VPN, Networking, Rendering |
| Sub-category | Dropdown | Dynamic based on Category |
| Description | Textarea | Detailed complaint/query |
| Date of Complaint | Date Picker | When the issue started |
| Duration | Auto-calculated | From complaint date to now |
| Current Time | Auto | System timestamp at submission |
| Priority | Dropdown | P1 (High), P2 (Medium), P3 (Low) with hover tooltip |
| Approval | Radio | Yes / No (approval taken from founder/manager) |
| Status | Dropdown | In Progress, Completed, Pending |

### 4.5 IT Sub-category Map

| Category | Sub-categories |
|----------|---------------|
| Software | Asana Issue, Mail Issue, Login Issue, Software Installation |
| Laptop/Device | Keyboard, Mouse, Charger, Screen Issue |
| Desktop | Power Cut Issue, Monitor, CPU Issue |
| Storage | Drive Full, Backup Issue, External Drive |
| VPN | VPN Not Connecting, Slow VPN, Access Denied |
| Networking | No Internet, Slow Internet, WiFi Issue |
| Rendering | Render Crash, Slow Render, GPU Issue |

### 4.6 HR Dashboard (HR Staff)
- View all HR complaints.
- Filter by status, priority, department.
- Update status of any complaint.
- Search by token number.

### 4.7 IT Dashboard (IT Staff)
- View all IT complaints.
- Filter by status, priority, category.
- Update status of any complaint.
- Search by token number.

### 4.8 Founder Dashboard
- View ALL complaints (HR + IT) in one unified dashboard.
- Department tag (HR / IT) shown on each complaint card.
- Update status of any complaint.
- Search by token number.
- No restrictions — full access.

### 4.9 Token System
- Format: `FT-HR-XXXXXX` or `FT-IT-XXXXXX` (alphanumeric, 6 chars).
- Shown to employee immediately after submission.
- Searchable by any logged-in user.

### 4.10 Email Notifications
- HR/IT staff get email when a new complaint is submitted to their department.
- Employee gets email when their complaint status is updated.
- Sent via Nodemailer (SMTP / Gmail).

---

## 5. Non-Functional Requirements

- Responsive design (desktop + mobile).
- Secure auth (JWT + Supabase).
- Role-based access control (RBAC).
- Frontend deployed on Vercel.
- Backend deployed on Vercel Serverless Functions or Railway.
- PostgreSQL via Supabase.

---

## 6. Out of Scope (v1)

- File/image attachment uploads.
- In-app chat.
- Mobile native app.
