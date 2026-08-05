# Ticketing — Feature Research & Workflows

Research into what HR and IT ticketing systems actually need, and the full
workflows for **IT**, **HR**, and **Admin/Founder**.

Companion to `PRD.md` / `USER_FLOW.md`. Where those describe what was built,
this describes what a real service desk needs and where the current build sits.

---

## 1. Where the product stands today

Grounded in the code, not aspiration:

| Piece | Today |
|-------|-------|
| Roles | `employee`, `hr`, `it`, `founder` — detected from email pattern (`authController.js:5`) |
| Departments | Two separate collections: `hr_complaints`, `it_complaints` |
| Statuses | `Pending` → `In Progress` → `Completed` (flat, no sub-states) |
| Priority | `P1` / `P2` / `P3` — stored, but no SLA attached |
| Token | `FT-HR-8X2A7K` / `FT-IT-…` — generated per ticket |
| Assignment | **None** — tickets belong to a department, never to a person |
| Notifications | Email on create (to dept) and on status change (to submitter) |
| Audit trail | **None** — only `updated_at` is kept; who changed what is lost |
| Attachments | **None** |
| SLA / escalation | **None** |

The two biggest structural gaps: **no assignee** and **no event history**.
Almost every feature below depends on one or both, so they come first.

---

## 2. The core insight: HR and IT are not the same product

They are currently built as mirror images of each other. They shouldn't be.

| | **IT** | **HR** |
|---|---|---|
| Domain model | Incident / service request | **Case** |
| Volume | High, repetitive | Low, each one unique |
| Visibility | Whole IT team should see it | **Only assigned handler + escalation path** |
| Optimised for | Speed, deflection, automation | Fairness, documentation, defensibility |
| Success metric | Time to resolve | Consistency and completeness of record |
| Reporter | Always known | May need to be **anonymous** |
| Risk if leaked | Annoying | **Legal liability** |

Industry tooling reflects this: IT desks follow ITIL (incident management,
request fulfilment, problem management), while HR uses *employee relations case
management* — anonymous intake, access-controlled records, audit-ready trails
for regulators or legal review.

**Practical consequence:** an IT ticket can default to team-visible. An HR ticket
must default to *need-to-know*, and the current `getAllComplaints` — which
returns every HR complaint to every HR user — is the wrong default for
harassment, pay, or manager-conduct cases.

---

## 3. Feature research

### 3.1 Shared core — both HR and IT

| Feature | Why it matters | Status |
|---|---|---|
| **Assignment to a person** | "The IT team" is not accountable; a named owner is | ❌ missing |
| **Activity timeline / audit log** | Every state change, comment, reassignment, with actor + timestamp | ❌ missing |
| **Threaded comments** | Handler ↔ employee conversation without leaving the ticket | ❌ missing |
| **Internal notes** | Handler-only notes, never shown to the employee | ❌ missing |
| **Attachments** | Screenshots for IT, documents for HR | ❌ missing |
| **SLA timers** | Response + resolution clocks per priority, visible countdown | ❌ missing |
| **Auto-escalation** | Breach → escalate to manager/founder automatically | ❌ missing |
| **Richer status model** | `Waiting on employee` must stop the SLA clock | ⚠️ 3 flat states |
| **Reopen** | A "fixed" ticket that isn't fixed should reopen, not spawn a duplicate | ❌ missing |
| **Server-side search & filter** | Filtering a client-side page only filters what's loaded | ⚠️ partial |
| **Saved views** | "My open P1s", "Unassigned > 24h" | ❌ missing |
| **CSAT after close** | One question: was this resolved? | ❌ missing |
| **Bulk actions** | Assign / close many at once | ❌ missing |
| **Notification preferences** | Per-user, per-event; email today, in-app later | ⚠️ hardcoded |

### 3.2 IT-specific

| Feature | Why |
|---|---|
| **Category → sub-category routing** | Already modelled in `IT_CATEGORIES`; use it to auto-assign to the right engineer |
| **Approval workflow** | The `approval` flag exists but does nothing. Hardware/licence purchases should route to a manager and **block** fulfilment until approved |
| **Asset linking** | Tie a ticket to the laptop/monitor it's about; see that asset's whole history |
| **Knowledge base + deflection** | "VPN not connecting" should offer the fix article *before* the submit button — the cheapest ticket is the one never raised |
| **Templates for common requests** | New joiner setup, software install, access request — pre-filled forms |
| **Problem management** | 8 tickets about the same crash = one underlying problem. Link children to a parent |
| **Change requests** | Planned work with a scheduled window, distinct from break/fix |
| **Recurring / scheduled tickets** | Monthly backup checks, licence renewals |
| **Duplicate detection** | Flag similar open tickets at intake |
| **Asset/licence expiry alerts** | Ticket auto-raised before a licence lapses |

### 3.3 HR-specific

| Feature | Why |
|---|---|
| **Case confidentiality levels** | `Normal` / `Confidential` / `Restricted`. Restricted = named handlers only, invisible to other HR staff |
| **Anonymous submission** | Reporter identity withheld, with a **two-way anonymous thread** so HR can still ask questions. This is the single most-cited HR-desk feature |
| **Conflict-of-interest routing** | A complaint *about* an HR person must never route to that person. Auto-reroute to founder |
| **Case type taxonomy** | Grievance, harassment, payroll, leave, policy, benefits, misconduct — each with its own required fields |
| **Investigation workflow** | Structured stages: intake → acknowledge → investigate → findings → outcome → closure |
| **Investigation notes & evidence** | Separate from the employee-visible thread, timestamped, immutable |
| **Participants** | Complainant, respondent, witnesses — each with controlled visibility |
| **Policy linkage** | Which handbook clause applies |
| **Outcome & action record** | What was decided, what action was taken, was it communicated |
| **Retention & legal hold** | Auto-delete after N years, unless held for litigation |
| **Immutable audit trail** | Who opened the case, who read it, what changed — defensible if challenged |
| **Escalation to founder/legal** | Explicit, logged, one click |
| **Anonymised reporting** | Trend stats without exposing individuals ("4 payroll cases this quarter") |

### 3.4 Admin / Founder

| Feature | Why |
|---|---|
| **Cross-department dashboard** | Both queues in one view |
| **SLA compliance reporting** | % met by department, by priority, trend over time |
| **Ageing report** | Oldest unresolved, stuck tickets, unassigned backlog |
| **Workload distribution** | Who is overloaded, who is idle |
| **Resolution-time analytics** | Median and P90 — the average hides the pain |
| **Repeat-issue detection** | Same employee or same category recurring → a systemic problem |
| **Bottleneck view** | Which stage consumes the most time |
| **User & role management** | Currently role comes from an email regex — brittle. Needs real admin control |
| **SLA policy configuration** | Change targets without a deploy |
| **Category & routing rules** | Add categories and assignment rules from the UI |
| **Business-hours calendar** | A P1 raised Friday 6pm shouldn't breach over the weekend |
| **Announcements** | "Mail server down — we know" banner to stop duplicate tickets |
| **Restricted HR access** | The founder sees HR *statistics* by default; opening a restricted case is an explicit, logged action |
| **Data export & audit** | CSV/PDF export for compliance |

### 3.5 Suggested build order

| Phase | Items | Rationale |
|---|---|---|
| **1 — Foundation** | Assignee, activity log, comments, internal notes, richer statuses | Everything else depends on these |
| **2 — Accountability** | SLA timers, auto-escalation, business hours, reopen, CSAT | Makes the promise in `PriorityBadge` real |
| **3 — HR safety** | Confidentiality levels, anonymous intake, conflict-of-interest routing, investigation stages, retention | Closes the current privacy gap |
| **4 — IT scale** | Approval gating, auto-routing, knowledge base, templates, asset linking, problem management | High-volume efficiency |
| **5 — Insight** | Founder analytics, SLA reporting, workload, bottlenecks, config UI | Answers "which department is slow?" |

---

## 4. Workflows

### 4.1 Unified ticket lifecycle (state machine)

Both departments share the skeleton; HR adds investigation stages.

```mermaid
stateDiagram-v2
    [*] --> New : employee submits

    New --> Triaged : handler reviews
    New --> Rejected : invalid / spam
    New --> Duplicate : matches existing

    Triaged --> Assigned : owner set
    Triaged --> AwaitingApproval : needs sign-off

    AwaitingApproval --> Assigned : approved
    AwaitingApproval --> Rejected : declined

    Assigned --> InProgress : work starts

    InProgress --> WaitingEmployee : need info
    InProgress --> WaitingThirdParty : vendor / other team
    InProgress --> Escalated : SLA breach or complexity

    WaitingEmployee --> InProgress : employee replies
    WaitingEmployee --> AutoClosed : no reply in 7 days
    WaitingThirdParty --> InProgress : response received
    Escalated --> InProgress : senior handler takes over

    InProgress --> Resolved : fix delivered
    Resolved --> Closed : employee confirms or 3 days pass
    Resolved --> Reopened : employee says not fixed
    Reopened --> InProgress

    Closed --> [*]
    Rejected --> [*]
    Duplicate --> [*]
    AutoClosed --> [*]

    note right of WaitingEmployee
        SLA clock PAUSES here.
        Waiting on the employee is
        not the handler's delay.
    end note
```

### 4.2 IT workflow — full

```mermaid
flowchart TD
    A[Employee opens IT ticket] --> B{Knowledge base match?}
    B -->|Article solves it| B1[Show fix article]
    B1 --> B2{Resolved?}
    B2 -->|Yes| B3[No ticket created<br/>deflection logged]
    B2 -->|No| C
    B -->|No match| C[Form: category → sub-category<br/>description, priority, attachments]

    C --> D[Ticket created<br/>token FT-IT-XXXXXX]
    D --> E[Email to submitter + IT queue]
    D --> F{Duplicate of an open ticket?}
    F -->|Yes| F1[Link as duplicate<br/>notify submitter] --> Z
    F -->|No| G[Auto-route by category]

    G --> H{Needs purchase or<br/>elevated access?}
    H -->|Yes| I[Status: Awaiting Approval]
    I --> J{Manager decision}
    J -->|Rejected| J1[Status: Rejected<br/>reason recorded] --> Z
    J -->|Approved| K
    H -->|No| K[Assign to engineer<br/>SLA clock starts]

    K --> L[Status: In Progress]
    L --> M{Blocked?}
    M -->|Need info from employee| M1[Waiting on Employee<br/>SLA paused]
    M1 --> M2{Replied in 7 days?}
    M2 -->|Yes| L
    M2 -->|No| M3[Auto-closed] --> Z
    M -->|Vendor or other team| M4[Waiting on Third Party<br/>SLA paused] --> L
    M -->|No| N

    N{SLA breached?}
    N -->|Yes| N1[Auto-escalate to IT lead<br/>notify founder] --> O
    N -->|No| O[Engineer resolves]

    O --> P{Recurring pattern?<br/>3+ similar tickets}
    P -->|Yes| P1[Link to Problem record<br/>root-cause track]
    P -->|No| Q
    P1 --> Q[Status: Resolved<br/>resolution note required]

    Q --> R[Notify employee]
    R --> S{Employee confirms?}
    S -->|Not fixed| S1[Reopened] --> L
    S -->|Confirms / 3 days pass| T[Status: Closed]
    T --> U[CSAT survey]
    U --> Z([End])
```

### 4.3 HR workflow — full

Confidentiality is the spine of this flow, not a feature bolted on.

```mermaid
flowchart TD
    A[Employee opens HR case] --> B{Submit anonymously?}
    B -->|Yes| B1[Identity withheld<br/>anonymous thread token issued]
    B -->|No| B2[Identity attached]
    B1 --> C
    B2 --> C[Select case type]

    C --> C1[Grievance / Harassment / Payroll /<br/>Leave / Policy / Benefits / Misconduct]
    C1 --> D[Type-specific required fields<br/>+ evidence upload]

    D --> E{Sensitivity}
    E -->|Harassment, misconduct,<br/>pay dispute| E1[Confidential<br/>named handlers only]
    E -->|Standard query| E2[Normal<br/>HR team visible]
    E1 --> F
    E2 --> F[Case created<br/>token FT-HR-XXXXXX]

    F --> G{Complaint about an HR<br/>staff member or manager?}
    G -->|Yes| G1[Conflict of interest<br/>route direct to founder<br/>hide from named party]
    G -->|No| G2[Route to HR queue]
    G1 --> H
    G2 --> H[Acknowledge within SLA<br/>employee sees: we have it]

    H --> I[Assign case handler<br/>logged in audit trail]
    I --> J[Status: Under Review]

    J --> K{Investigation needed?}
    K -->|No — simple query| K1[Answer + guidance] --> Q
    K -->|Yes| L[Status: Investigation]

    L --> M[Add participants<br/>complainant / respondent / witnesses]
    M --> N[Gather statements + evidence<br/>internal notes, employee never sees]
    N --> O{Escalate?}
    O -->|Legal risk / serious| O1[Escalate to founder or legal<br/>explicit + logged] --> P
    O -->|No| P[Findings recorded<br/>linked to policy clause]

    P --> Q[Outcome decided<br/>action recorded]
    Q --> R[Communicate to employee<br/>anonymous thread if anonymous]
    R --> S{Employee satisfied?}
    S -->|No — appeal| S1[Appeal → founder review] --> P
    S -->|Yes| T[Status: Closed]

    T --> U[Retention clock starts<br/>auto-purge after N years]
    U --> V{Legal hold?}
    V -->|Yes| V1[Retain indefinitely]
    V -->|No| V2[Purge on schedule]
    V1 --> W([End])
    V2 --> W
```

### 4.4 Admin / Founder workflow

```mermaid
flowchart TD
    A[Founder signs in] --> B[Overview dashboard]

    B --> C[Live health tiles]
    C --> C1[Open by department]
    C --> C2[SLA breaches today]
    C --> C3[Unassigned > 24h]
    C --> C4[Median resolution time]

    B --> D[Drill-down]
    D --> D1[IT queue — full detail]
    D --> D2[HR queue — statistics only by default]
    D2 --> D3{Open a confidential case?}
    D3 -->|Yes| D4[Access logged in audit trail<br/>handler notified]
    D3 -->|No| D5[Aggregated counts only]

    B --> E[Reporting]
    E --> E1[SLA compliance by dept + priority]
    E --> E2[Ageing / stuck tickets]
    E --> E3[Workload per handler]
    E --> E4[Repeat issues + root causes]
    E --> E5[Bottleneck: slowest stage]
    E --> E6[Export CSV / PDF]

    B --> F[Configuration]
    F --> F1[Users & roles<br/>replaces email-regex detection]
    F --> F2[SLA targets per priority]
    F --> F3[Categories & routing rules]
    F --> F4[Business hours & holidays]
    F --> F5[Escalation chains]
    F --> F6[Retention policy]

    B --> G[Actions]
    G --> G1[Reassign / reprioritise]
    G --> G2[Force escalate]
    G --> G3[Post announcement banner]
    G --> G4[Approve IT purchase requests]
```

### 4.5 SLA & escalation timing

```mermaid
sequenceDiagram
    autonumber
    participant E as Employee
    participant S as System
    participant H as Handler
    participant L as Team Lead
    participant F as Founder

    E->>S: Submit ticket (P1)
    S->>S: Start response clock (2h)
    S->>H: Notify — new P1 assigned

    alt Responded in time
        H->>E: First response
        S->>S: Response met · start resolution clock (8h)
    else No response in 2h
        S->>L: Escalate — response breach
        S->>S: Flag SLA breach on ticket
        L->>H: Reassign or assist
    end

    opt Waiting on employee
        H->>E: Request more info
        S->>S: PAUSE clock
        E->>H: Reply
        S->>S: RESUME clock
    end

    alt Resolved in time
        H->>E: Resolution + note
        S->>E: CSAT survey
    else Resolution breached
        S->>F: Escalate to founder
        S->>S: Record breach for reporting
    end

    Note over S: Clocks run on business hours only.<br/>A Friday-evening P1 does not<br/>burn the weekend.
```

**Proposed SLA matrix** — makes the promise already shown in the priority
picker enforceable:

| Priority | Meaning | First response | Resolution target | On breach |
|---|---|---|---|---|
| **P1 — High** | Work is blocked | 2 hours | 8 business hours | Team lead, then founder |
| **P2 — Medium** | Work continues | 24 hours | 3 business days | Team lead |
| **P3 — Low** | Minor request | 3 days | 10 business days | Flag in ageing report |

### 4.6 Access control — who sees what

```mermaid
flowchart LR
    subgraph Roles
        EMP[Employee]
        ITS[IT Staff]
        HRS[HR Staff]
        HRL[HR Lead]
        FDR[Founder]
    end

    subgraph Data
        OWN[Own tickets]
        ITQ[All IT tickets]
        HRN[HR — normal cases]
        HRC[HR — confidential cases]
        STAT[Aggregated statistics]
        CFG[Configuration & users]
    end

    EMP --> OWN
    ITS --> ITQ
    ITS --> OWN
    HRS --> HRN
    HRS --> OWN
    HRL --> HRN
    HRL --> HRC
    FDR --> ITQ
    FDR --> HRN
    FDR --> STAT
    FDR --> CFG
    FDR -.->|logged access only| HRC

    style HRC fill:#7f1d1d,stroke:#f87171,color:#fff
    style FDR fill:#1e3a8a,stroke:#60a5fa,color:#fff
```

The dashed edge is deliberate: the founder *can* open a confidential HR case,
but never silently. Every such read is written to the audit trail and the
assigned handler is notified.

---

## 5. Immediate recommendations

1. **Add `assignee_id` and an `events` sub-collection first.** Without them,
   SLA, escalation, audit, and analytics are all unbuildable.
2. **Split HR read access.** `getAllComplaints` handing every HR case to every
   HR user is the highest-risk gap in the product today.
3. **Make P1/P2/P3 mean something.** The UI already promises "response within
   2 hours" — right now nothing measures or enforces it.
4. **Replace email-regex role detection** with admin-managed roles. A typo in an
   email today silently grants or denies HR access.
5. **Add `Waiting on Employee`** before anything else in the status model — it
   is the difference between honest and flattering resolution metrics.

---

## Sources

- [IT Ticketing Systems: Essential Features (2026) — Intercom](https://www.intercom.com/learning-center/it-ticketing-systems)
- [Help desk ticketing system features and requirements — ManageEngine](https://www.manageengine.com/products/service-desk/helpdesk-tour.html)
- [Ticketing System for ITIL Workflows — Meegle](https://www.meegle.com/en_us/topics/ticketing-system/ticketing-system-for-itil-workflows)
- [Ticketing System: How It Works, Key Features — InvGate](https://blog.invgate.com/ticketing-system)
- [HR Grievance Management Software for Employee Relations — SpeakUp](https://www.speakup.com/solutions/hr-grievance-management-software-for-employee-relations)
- [Case Management Software for HR: Features & Platforms 2026 — HR Acuity](https://www.hracuity.com/blog/case-mangement-software-for-hr/)
- [HR and Labor Relations Case Management Software — VComply](https://www.v-comply.com/blog/hr-labor-relations-employee-case-management-software/)
- [Employee Relations Case Management Tools — FaceUp](https://www.faceup.com/en/blog/best-employee-case-management-tools)
