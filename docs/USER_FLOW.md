# USER_FLOW.md — User Flows
# Fute Services — Project Ticket Portal

> Traced against `App.jsx`'s actual route table and each dashboard's real controls — not the original single-role complaint-form concept.

---

## 1. Overall Flow

```mermaid
flowchart TD
    START(["Visit the portal"]) --> LOGIN["/ — Login"]
    LOGIN -->|"quick-demo tile\nor real credentials"| ROLE{"Role on the account"}
    ROLE -->|founder| FDASH["/founder/dashboard"]
    ROLE -->|hr| HDASH["/hr/overview"]
    ROLE -->|it| IDASH["/it/dashboard"]
    ROLE -->|coordinator| CDASH["/coordinator/overview"]
    ROLE -->|employee| EDASH["/employee/dashboard"]

    LOGIN -.->|"backend unreachable"| DEMO["Falls back to a local\ndemo account automatically"]
    DEMO --> ROLE
```

A visitor who isn't signed in, or who is signed in as the wrong role, is redirected straight back to `/` — there is no "access denied" page (`RequireAuth`, enforced on every protected route).

## 2. Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Login Page
    participant API as Express /api/auth
    participant Demo as Local demo accounts

    U->>FE: Enter email + password, submit
    FE->>API: POST /login
    alt backend reachable & credentials valid
        API-->>FE: { token, role, full_name, email }
        FE->>FE: store in localStorage or sessionStorage\n(per "Remember me")
    else backend unreachable (network error)
        FE->>Demo: dummyLogin(email, password)
        Demo-->>FE: same-shaped { token, role, ... }
    else backend reachable but 401
        API-->>FE: 401 Invalid credentials
        FE-->>U: "That email and password do not match."
    end
    FE->>FE: navigate to homeFor(role)
```

Five quick-demo tiles on the login screen (Founder, HR, IT, Coordinator, Employee) skip typing entirely and log in as a seeded account for exactly this reason — trying every role without a live backend.

## 3. Employee Flow

```mermaid
flowchart TD
    L["Employee logs in"] --> D["/employee/dashboard"]
    D --> T1["Dashboard tab —\nRaise Ticket button"]
    D --> T2["My Tickets tab"]
    D --> T3["My Tasks tab"]

    T1 --> FORM["Ticket form:\ncategory, sub-category,\npriority, department, description"]
    FORM -->|"description required"| VALID{Valid?}
    VALID -->|no| FORM
    VALID -->|yes| CREATE["Ticket created (client state)\nStatus: Open"]
    CREATE --> QUEUE["Appears immediately in\nIT's Tickets Queue"]
    CREATE --> T2

    T3 --> TASKS["Tasks assigned by the\nCoordinator, read-only here"]
```

## 4. IT Service Desk Flow

```mermaid
flowchart TD
    L["IT staff logs in"] --> D["/it/dashboard"]
    D --> Q["Tickets Queue —\nfilter: All / Open / In Progress /\nWaiting Approval / Resolved / Closed"]
    D --> AC["Approval Center"]
    D --> DR["Data Requests"]
    D --> AM["Asset Management"]
    D --> RL["Reports & Logs"]

    Q -->|"change status"| Q
    AC -->|"raise a request needing\nelevated clearance"| SUB["Submitted to ApprovalContext\nstatus: pending_founder"]
    SUB --> FA["Shows up on Founder's\nApproval System"]
    FA -->|approved / declined| AC

    DR -->|"New Data Transfer Request"| SUB2["Server → Server transfer\nrouted the same way"]
    SUB2 --> FA
```

## 5. HR Flow

```mermaid
flowchart TD
    L["HR logs in"] --> D["/hr/overview"]
    D --> DIR["Directory — filter by department"]
    D --> CAND["Candidates — pipeline stages,\nsearch, filter"]
    D --> INT["Interviews — schedule, change status"]
    D --> ATT["Attendance — today's snapshot +\nper-employee monthly history"]
    D --> EM["Email — inbox / sent / drafts / templates"]
    D --> REP["Reports — 6 report types,\nCSV + printable export"]

    CAND -->|"stage: Applied → ... → Joined"| CAND
    ATT -->|"employee has a leave request"| LEAVE["Leave shows on employee's record"]
    LEAVE -->|"submitter is HR or IT staff"| FOUNDER_APPROVAL["Routes to Founder\nfor approval, not HR"]
    LEAVE -->|"submitter is any other dept"| HR_NOTE["No separate HR approval\nqueue currently exists"]
```

> HR currently has no dedicated leave-approval screen of its own — every leave request, regardless of department, is decided on the Founder's dashboard. This is a deliberate current design, not an oversight (see [BACKEND_WORKFLOW.md](./BACKEND_WORKFLOW.md) §5), but worth knowing if you're looking for an "HR approves leave" screen and can't find one.

## 6. Coordinator Flow

```mermaid
flowchart TD
    L["Coordinator logs in"] --> D["/coordinator/overview"]
    D --> P["/coordinator/projects"]
    D --> T["/coordinator/tasks"]
    P --> PD["/coordinator/projects/:id\n(Project not found + back-link\nif the id doesn't exist)"]
    T -->|"Assign Task"| FORM["Title (required), Project,\nAssignee, Priority, Due Date (required),\nDuration, Figma link, PR link"]
    FORM -->|"missing title or due date"| FORM
    FORM -->|valid| CREATE["Task created, appears in\nboard/list view immediately"]
    CREATE --> EMP["Assignee sees it on their\n/employee/dashboard My Tasks tab"]
```

## 7. Founder Flow

```mermaid
flowchart TD
    L["Founder logs in"] --> D["/founder/dashboard"]
    D --> DOCK["Left AppleDock — switches\nthe active department view"]
    DOCK --> OV["Founder Overview"]
    DOCK --> APV["Approval System —\nIT approvals + HR/IT leave requests"]
    DOCK --> PROJ["Project Details"]
    DOCK --> REP["Reports"]
    DOCK --> HRV["HR Department view"]
    DOCK --> ITV["IT Service Desk view"]
    DOCK --> AI["AI Agent Command Room"]
    DOCK --> CHAT["Team Chat Hub"]
    DOCK --> OUT["Sign Out"]

    APV -->|"Approve / Decline"| DECIDE["Context state updated;\nrequester's view reflects it live"]
    AI -->|"pick a template or type a question"| CABINET["See AI_WORKFLOW.md"]
```

## 8. Sign-out Flow (all roles)

```mermaid
flowchart LR
    A["Profile menu\n(sidebar footer, or the\nFounder's AppleDock)"] --> B["Sign out"]
    B --> C["AuthContext.logout():\nclears localStorage AND sessionStorage"]
    C --> D["Redirect to /"]
    D --> E{"Try the old protected URL again?"}
    E -->|yes| D
```

## 9. Page Map (as routed in `App.jsx`)

```
/                              → Login
/login, /signup                → both redirect to /
/founder                       → redirects to /founder/dashboard
/founder/dashboard             → Founder (role: founder)
/it/dashboard                  → IT Service Desk (role: it)
/employee/dashboard            → Employee (role: employee)
/hr/dashboard                  → redirects to /hr/overview (legacy path)
/hr/overview                   → HR Dashboard (role: hr)
/hr/candidates                 → HR Candidates
/hr/interviews                 → HR Interviews
/hr/attendance                 → HR Attendance
/hr/email                      → HR Email
/hr/directory                  → HR Directory
/hr/reports                    → HR Reports
/coordinator/overview          → Coordinator Dashboard (role: coordinator)
/coordinator/tasks             → Coordinator Tasks
/coordinator/projects          → Coordinator Projects
/coordinator/projects/:id      → Coordinator Project Detail
*                              → redirects to /
```
