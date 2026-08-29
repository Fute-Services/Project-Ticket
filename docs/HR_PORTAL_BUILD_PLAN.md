# Fute Services HR Desk: What's Left to Build, and How It Fits Together

A build plan for the seven gaps still open in the HR Portal: the four left half-finished inside the five parts already built and shipped, plus three more that were dropped from scope earlier and are now back in. Every step below was checked against the actual, current codebase (the project's real code), not assumed.

**Status:** Planning only, no code written. **Scope:** HR, Employee, Founder. **Prepared:** 29 Aug 2026. **Updated:** 29 Aug 2026, the payroll decision was resolved against the real Zoho tool.

Throughout this document, items are labeled: **Already exists (reuse)**, **New build**, **Decision needed first**, or **Resolved this round**.

## Part 1: Finishing the Five Shipped Parts

### 01. Document Template: Approval Workflow

Documents upload and go live immediately today. The original plan called for routing them through an approver first, with the Founder copied on every decision.

1. **(Decide first)** Decide the approval model: does it need to be two specific named people (referred to as Payel Ma'am and Soma Ma'am in the original notes), or is "anyone holding the HR role" close enough? The app currently only models roles (like "HR"), not specific named individuals.
2. **(Reuse)** Reuse the existing "approvals" record type and its Tickets workflow. Add a new category, `'document'`, instead of building a separate, parallel system.
3. **(New)** On upload, create a pending approval record instead of finalizing the document immediately. Route project-related documents to Production/Ratish, and general ones to HR.
4. **(Reuse)** On every decision, notify the Founder by reusing the existing email-sending system (`mailer.js`) that's already wired up for ticket notifications.
5. **(Reuse)** The Directory's document list gets a "Pending approval" state, and HR/Founder get an approval queue. The existing Approval Center screen already displays exactly this shape of data.
6. **(New)** Add a free-text remarks field per document, notifying the Founder the same way as a decision.

### 02. Leave: Reason, Date Range, Policy Document

Today's Leave option is a same-day, no-reason toggle on the Check-in widget. The original plan asked for a real request process: a date range and a reason, plus a Leave Policy document employees can actually read.

1. **(Decide first)** Decide whether to keep the light self-declare model (just extended a bit), or introduce a proper `leave_requests` record type in the database. The date-range-plus-reason request fits the second option more naturally.
2. **(New)** Extend the Leave action into a small form (From date, To date, Reason) instead of a single dropdown option.
3. **(New)** On the server: accept the date range and either write one attendance row per day (which keeps the existing "count Leave-status rows" balance math working without any changes) or write one record spanning the whole range, depending on the decision made in step 1.
4. **(Reuse)** Leave Policy document: add it as an 11th entry in the existing Document Template list. No new technical work needed, it uses the same upload and viewing setup already built.

### 03. Founder's Own View

Founder was named as one of the three intended audiences for this system, but none of the five parts built so far actually show up on the Founder's dashboard. Everything currently only lives in HR's Directory page.

1. **(Decide first)** Decide the shape: a full copy of HR's Directory page, or a lighter, read-only summary (headcounts, pending approvals, a performance summary).
2. **(Reuse, if a full copy)** Add a Founder navigation entry pointing to the same Directory-style page. The underlying data access already grants Founders read access, only the visible route/screen needs to be opened up to them.
3. **(New, if a summary)** Build new dashboard cards (organization-wide leave taken, pending document approvals, performance by department) once the shape is settled.

### 04. Employee's Own Leave and Performance

The Employee Portal only has the Check-in widget today. Leave balance and performance numbers currently exist only inside HR's Directory page. An employee cannot see their own numbers.

1. **(New)** Add endpoints (server addresses the app talks to) scoped to just the logged-in employee, mirroring the existing pattern already used for "my attendance today," so an employee can read their own leave count and performance entries without needing HR's broader access.
2. **(Reuse)** Pull the Leave and Performance display code that's already built inside `Directory.jsx` out into a shared, reusable piece, so the Employee Portal reuses the exact same visual cards instead of rebuilding them from scratch.
3. **(New)** Add "My Leave" and "My Performance" tabs to the Employee dashboard.

## Part 2: Parts Dropped Earlier, Now Back in Scope

### 05. Extra Hours Logging

Nothing exists for this yet. It's a full new part of the system.

1. **(New)** A new `extra_hours` record type in the database, with fields: `employeeId`, `projectCode`, `hours`, `date`, `time`, `teammates[]` (a list of teammates), `status`.
2. **(New)** An employee-facing submission form on the Employee Portal.
3. **(Decide first)** Decide the two-step approval process: literally the named people Payel-then-Soma in sequence, or the HR-role-then-Founder-role in sequence.
4. **(Reuse)** Reuse the existing "approvals" record type again (with category `'extra-hours'`) rather than building a separate approval system from scratch.
5. **(New)** Show a running extra-hours total on the Employee Profile inside the Directory.

### 06. System / Technical

Better news here: default working hours and the company holiday list already exist and work end-to-end in Super Admin Settings (`workingHoursStart`/`workingHoursEnd`, `holidays[]`), and are already readable by any logged-in user. Only "system remarks" is genuinely not yet built.

1. **(Reuse)** Add a read-only "Holidays" screen inside HR/Employee. It can call the existing `getSystemSettings()` server address directly, no new backend (server-side) work needed.
2. **(Reuse)** Flag late check-ins on the Attendance page by comparing the check-in time against `workingHoursStart`. This is a small screen change over data that already exists.
3. **(Decide first)** Decide where "system remarks" actually attaches: to a specific employee record, or to a general log, before scoping out the work to build it.

### 07. Salary Slip / Payroll

Nothing built yet, but the open question from the earlier plan is now resolved: Zoho's free payslip (pay stub) generator, the actual tool the original notes pointed to, turns out to be a simple browser form with no login and no connectable service behind it (no API, meaning no programmatic way for one system to talk to another). There's no account or service to connect to. It's a layout to copy, not a service to link up with.

1. **(Resolved)** Build this in-house (inside our own system). Confirmed directly against Zoho's tool: it stores nothing, requires no sign-in, and offers no way for another system to connect to it, so "integrating with it" was never actually an option here.
2. **(Confirmed)** Field list, taken from the real tool: Company (name, logo, address); Employee (name, ID, designation, PAN, bank account, UAN, which are Indian tax and provident-fund ID numbers); Pay period (period, year, paid days, LOP days meaning "loss of pay" days, payment date); custom Earnings and Deductions line items; computed Gross pay, Total Deductions, and Net Payable amounts; the amount written out in words.
3. **(New, small)** Employee Details already covers most of this (PAN, bank account, designation, employee code). Only the UAN field is genuinely new and needs to be added.
4. **(New)** Build the payslip layout matching that exact structure, filled in from the employee's saved salary figure plus that period's attendance record (paid days and loss-of-pay days calculated from check-in records).
5. **(New)** Add a "Generate Payslip" action with a PDF download to the Employee Profile.

## System Architecture: How the Seven Gaps Plug Into What's Already Running

Most of the data already flows through the system today, using the same Express API (the backend server that handles all requests) and the same approvals and file-storage pattern already in production. Only two genuinely new pieces are being added to the shape of the system: the new `extra_hours` record type, and a new Founder-facing screen.

In plain terms: the Firestore database already holds records for attendance, employees, approvals, performance entries, and settings, all served through the `/api/hr-desk` part of the Express API. The Employee Portal (Check-in, My Leave, My Performance), the HR Directory (with the Employee Profile), and the Founder Dashboard (a new screen) are the client-facing apps that read and write this data. People involved include Employees, HR, the Founder, and Nitish from Production. Firebase Storage holds uploaded documents. The Zoho payslip layout is referenced only as a template to match, it has no live account or connection, so it sits outside the main data flow as a reference-only box.

- A solid connection between two parts means real data already flows there today.
- A dotted connection means a new notification or an optional future integration.
- Anything marked "(new)" is one of the only two additions to the actual data model.

Grounded against the current codebase on 29 Aug 2026. Every "already exists" claim above was checked directly in the real project files, not assumed. No code was written or changed in producing this plan.
