# USER_FLOW.md — User Flow Diagrams & Descriptions
# Fute Complaint Token Generation Portal

---

## 1. Overall System Flow

```
[User visits portal]
        |
        v
[Landing Page — Fute Branding]
        |
        v
[Login / Register]
        |
        +---> Role detected from email
        |
        +---> employee  --> Employee Dashboard
        +---> hr        --> HR Dashboard
        +---> it        --> IT Dashboard
        +---> founder   --> Founder Dashboard
```

---

## 2. Employee Flow

```
[Employee Login]
        |
        v
[Employee Dashboard]
  - See all my complaints (HR + IT) with tokens
  - Button: "Raise HR Complaint"
  - Button: "Raise IT Complaint"
  - Search bar: search by token
        |
        +---> [Raise HR Complaint]
        |           |
        |           v
        |     [HR Complaint Form]
        |     Fill: Name, Dept, Description,
        |           Date, Priority
        |     Auto: Duration, Current Time
        |           |
        |           v
        |     [Submit] --> Token Generated: FT-HR-XXXXXX
        |                  Email sent to HR Staff
        |                  Token shown on screen
        |                  Complaint saved to dashboard
        |
        +---> [Raise IT Complaint]
        |           |
        |           v
        |     [IT Complaint Form]
        |     Fill: Name, Dept, Category,
        |           Sub-category, Description,
        |           Date, Priority, Approval
        |     Auto: Duration, Current Time
        |           |
        |           v
        |     [Submit] --> Token Generated: FT-IT-XXXXXX
        |                  Email sent to IT Staff
        |                  Token shown on screen
        |
        +---> [Search by Token]
                    |
                    v
              [Complaint Detail View]
              Shows: all fields + current status
```

---

## 3. HR Staff Flow

```
[HR Staff Login]
  (email: hr.fute2@gmail.com)
        |
        v
[HR Dashboard]
  - View all HR complaints (table/card view)
  - Filter: by status, priority, department
  - Search: by token
        |
        +---> [Click on complaint]
        |           |
        |           v
        |     [Complaint Detail]
        |     - View all fields
        |     - Update Status dropdown
        |       (Pending / In Progress / Completed)
        |     - Save → Employee gets email notification
        |
        +---> [Raise IT Complaint] (HR can raise IT complaints)
                    |
                    v
              [IT Complaint Form] → same as employee IT flow
```

---

## 4. IT Staff Flow

```
[IT Staff Login]
  (email: system.futeservice@gmail.com)
        |
        v
[IT Dashboard]
  - View all IT complaints (table/card view)
  - Filter: by status, priority, category
  - Search: by token
        |
        +---> [Click on complaint]
        |           |
        |           v
        |     [Complaint Detail]
        |     - View all fields
        |     - Update Status dropdown
        |       (Pending / In Progress / Completed)
        |     - Save → Employee gets email notification
        |
        +---> [Raise HR Complaint] (IT can raise HR complaints)
                    |
                    v
              [HR Complaint Form] → same as employee HR flow
```

---

## 5. Founder Flow

```
[Founder Login]
  (role manually set in DB)
        |
        v
[Founder Dashboard]
  - Unified view: ALL complaints (HR + IT)
  - Each card tagged: [HR] or [IT]
  - Filter: by dept (HR/IT), status, priority
  - Search: by token
        |
        +---> [Click on any complaint]
                    |
                    v
              [Complaint Detail]
              - View all fields
              - Update Status (any complaint)
              - Save → Employee gets email notification
        |
        +---> [Raise HR Complaint]
        +---> [Raise IT Complaint]
              (Founders can also submit complaints)
```

---

## 6. Token Search Flow

```
[Any logged-in user]
        |
        v
[Search bar — enter token e.g. FT-HR-A3X9K2]
        |
        v
[API call: GET /api/hr/complaints/search?token=FT-HR-A3X9K2]
        |
        v
[Complaint Detail View]
  - Token, Name, Department
  - Description, Date, Duration
  - Priority, Status
  - Submitted At, Last Updated
```

---

## 7. Email Notification Flow

```
[Complaint Submitted]
        |
        +---> Backend triggers Nodemailer
        |     Recipient: HR or IT staff email
        |     Subject: "New Complaint Received — FT-HR-XXXXXX"
        |     Body: Submitter name, dept, priority, token
        |
[Status Updated by HR/IT/Founder]
        |
        +---> Backend triggers Nodemailer
              Recipient: Complaint submitter email
              Subject: "Your Complaint FT-HR-XXXXXX has been updated"
              Body: New status, updated by, timestamp
```

---

## 8. Registration Flow

```
[User visits /register]
        |
        v
[Fill: Full Name, Email, Password, Department]
        |
        v
[Backend checks email pattern]
  - hr.fute* → role = hr
  - system.fute* / system.futeservice* → role = it
  - founder set manually in DB
  - others → role = employee
        |
        v
[Account created in Supabase Auth + users table]
        |
        v
[Redirect to appropriate dashboard]
```

---

## 9. Page Map

```
/                        → Landing Page (Fute branding)
/login                   → Login Page
/register                → Register Page
/employee/dashboard      → Employee Dashboard
/employee/complaint/hr   → HR Complaint Form
/employee/complaint/it   → IT Complaint Form
/hr/dashboard            → HR Staff Dashboard
/it/dashboard            → IT Staff Dashboard
/founder/dashboard       → Founder Dashboard
/search                  → Token Search Page
```
