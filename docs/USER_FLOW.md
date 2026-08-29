# USER_FLOW.md: User Flows
# Fute Services: Project Ticket Portal

> This document was traced against the app's actual navigation code and each dashboard's real, working controls, not the original single-role complaint-form idea the project started from.

---

## 1. Overall flow

```mermaid
flowchart TD
    START(["Visit the portal"]) --> LOGIN["/ (Login)"]
    LOGIN -->|"quick-demo tile\nor real credentials"| ROLE{"Role on the account"}
    ROLE -->|founder| FDASH["/founder/dashboard"]
    ROLE -->|hr| HDASH["/hr/overview"]
    ROLE -->|it| IDASH["/it/dashboard"]
    ROLE -->|coordinator| CDASH["/coordinator/overview"]
    ROLE -->|employee| EDASH["/employee/dashboard"]

    LOGIN -.->|"backend unreachable"| DEMO["Falls back to a local\ndemo account automatically"]
    DEMO --> ROLE
```

A visitor who isn't signed in, or who is signed in but as the wrong role for a given page, is sent straight back to the login page. There's no separate "access denied" page for this, it's handled by a single route-guard component (`RequireAuth`) that every protected page uses.

## 2. Signing in

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
        FE->>FE: store in localStorage or sessionStorage (per "Remember me")
    else backend unreachable (network error)
        FE->>Demo: dummyLogin(email, password)
        Demo-->>FE: same-shaped { token, role, ... }
    else backend reachable but 401
        API-->>FE: 401 Invalid credentials
        FE-->>U: "That email and password do not match."
    end
    FE->>FE: navigate to homeFor(role)
```

*(Note: the diagram above describes how sign-in worked when this document was first written, storing a login token in the browser's local storage. That part has since changed to a more secure approach; see `docs/AUTH_WORKFLOW.md` for how it actually works today.)*

There are five "quick demo" tiles on the login screen, one each for Founder, HR, IT, Coordinator, and Employee. They skip typing a password entirely and sign straight into a pre-set sample account, specifically so anyone can try out every role without needing a live backend server running.

## 3. What an employee sees

```mermaid
flowchart TD
    L["Employee logs in"] --> D["/employee/dashboard"]
    D --> T1["Dashboard tab: Raise Ticket button"]
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

## 4. What IT staff see

```mermaid
flowchart TD
    L["IT staff logs in"] --> D["/it/dashboard"]
    D --> Q["Tickets Queue: filter by\nAll / Open / In Progress /\nWaiting Approval / Resolved / Closed"]
    D --> AC["Approval Center"]
    D --> DR["Data Requests"]
    D --> AM["Asset Management"]
    D --> RL["Reports & Logs"]

    Q -->|"change status"| Q
    AC -->|"raise a request needing\nelevated clearance"| SUB["Submitted to ApprovalContext\nstatus: pending_founder"]
    SUB --> FA["Shows up on Founder's\nApproval System"]
    FA -->|approved / declined| AC

    DR -->|"New Data Transfer Request"| SUB2["Server to server transfer\nrouted the same way"]
    SUB2 --> FA
```

## 5. What HR sees

```mermaid
flowchart TD
    L["HR logs in"] --> D["/hr/overview"]
    D --> DIR["Directory: filter by department"]
    D --> CAND["Candidates: pipeline stages,\nsearch, filter"]
    D --> INT["Interviews: schedule, change status"]
    D --> ATT["Attendance: today's snapshot +\nper-employee monthly history"]
    D --> EM["Email: inbox / sent / drafts / templates"]
    D --> REP["Reports: 6 report types,\nCSV + printable export"]

    CAND -->|"stage: Applied to ... to Joined"| CAND
    ATT -->|"employee has a leave request"| LEAVE["Leave shows on employee's record"]
    LEAVE -->|"submitter is HR or IT staff"| FOUNDER_APPROVAL["Routes to Founder\nfor approval, not HR"]
    LEAVE -->|"submitter is any other dept"| HR_NOTE["No separate HR approval\nqueue currently exists"]
```

> HR doesn't currently have its own dedicated screen for approving leave requests. Every leave request, no matter which department it comes from, is decided on the Founder's dashboard instead. This is a deliberate design choice as things stand today, not something that was overlooked (see [BACKEND_WORKFLOW.md](./BACKEND_WORKFLOW.md) section 5), but it's worth knowing if you go looking for an "HR approves leave" screen and can't find one.

## 6. What a coordinator sees

```mermaid
flowchart TD
    L["Coordinator logs in"] --> D["/coordinator/overview"]
    D --> P["/coordinator/projects"]
    D --> T["/coordinator/tasks"]
    P --> PD["/coordinator/projects/:id\n(shows Project not found + a back link\nif that id doesn't exist)"]
    T -->|"Assign Task"| FORM["Title (required), Project,\nAssignee, Priority, Due Date (required),\nDuration, Figma link, PR link"]
    FORM -->|"missing title or due date"| FORM
    FORM -->|valid| CREATE["Task created, appears in\nboard/list view immediately"]
    CREATE --> EMP["Assignee sees it on their\n/employee/dashboard My Tasks tab"]
```

## 7. What the Founder sees

```mermaid
flowchart TD
    L["Founder logs in"] --> D["/founder/dashboard"]
    D --> SIDE["Left sidebar: the same collapsible,\nmobile-drawer pattern as every\nother dashboard, switches the\nactive department view"]
    SIDE --> OV["Founder Overview"]
    SIDE --> APV["Approval System:\nIT approvals + HR/IT leave requests"]
    SIDE --> PROJ["Project Details"]
    SIDE --> REP["Reports"]
    SIDE --> HRV["HR Department view"]
    SIDE --> ITV["IT Service Desk view"]
    SIDE --> CHAT["Team Chat Hub"]
    SIDE --> AI["Fute AI+: a separate, visually\ndistinct button above the profile\nfooter, not one of the regular nav rows"]
    SIDE --> OUT["Sign out: profile footer,\nsame as every other dashboard"]

    APV -->|"Approve / Decline"| DECIDE["Shared app state updated;\nrequester's view reflects it live"]
    AI -->|"pick a template or type a question"| CABINET["See AI_WORKFLOW.md"]
```

## 8. Signing out (every role)

```mermaid
flowchart LR
    A["Profile menu in the sidebar footer\n(same pattern for every role,\nincluding the Founder)"] --> B["Sign out"]
    B --> C["Logs out: clears the saved\nlogin information"]
    C --> D["Redirect to the login page"]
    D --> E{"Try the old protected page's\nweb address again?"}
    E -->|yes| D
```

## 9. Page map (every page the app can navigate to)

```
/                              → Login
/login, /signup                → both redirect to /
/founder                       → redirects to /founder/dashboard
/founder/dashboard             → Founder (role: founder)
/it/dashboard                  → IT Service Desk (role: it)
/employee/dashboard            → Employee (role: employee)
/hr/dashboard                  → redirects to /hr/overview (an older, no-longer-used path)
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
