# Enterprise Portal: System Architecture, Workflows & Master Blueprint

> **Document Version**: 2.0  
> **Last Updated**: August 6, 2026  
> **System Purpose**: Unified Enterprise Operating System connecting **Multi-Department Employees**, **IT Service Desk**, **HRMS Operations**, **Project Coordinator Hub**, **Founder Governance**, and a **Real-Time Slack/Discord-like Collaboration Center**.

---

## 1. Executive Vision & Core Objectives

The portal serves as the single source of truth for the entire organization. It is designed to streamline operations, eliminate administrative bottlenecks, and establish real-time cross-departmental accountability:

1. **Multi-Department IT Ticketing System**: Every employee across any department (Sales, Marketing, HR, Engineering, Finance, Operations) can instantly raise an IT ticket when encountering technical, hardware, software, or network issues. The IT Desk receives instant notifications, tracks SLA compliance, manages hardware assets, and resolves issues.
2. **Founder Approval & Governance Engine**: Critical decisions—such as data transfers, high-budget hardware requisitions, HR/IT department head leave requests, and final candidate offers—are routed directly to the Founder's Dashboard for 1-click **Approve** or **Decline**.
3. **HRMS & Campus Recruitment Engine**: HR manages employee attendance, campus placement drives, candidate follow-up pipelines, interview scheduling, leave approvals, and analytical HR reports.
4. **Project Coordinator Workspace**: Coordinators sit at the intersection of the Founder, Designers, and Developers. They manage project creation, task assignments, milestone tracking, and technical asset allocation.
5. **Real-Time Discord/Slack-like Communication Hub**: Integrated chat channels (`#general`, `#it-support`, `#hr-announcements`, `#project-alpha`) and direct messaging where teams share tickets, files, data, and updates transparently.

---

## 2. Current Implementation Progress Report

| Module / Component | Status | Key Features Delivered |
| :--- | :--- | :--- |
| **Authentication & RBAC** | ✅ Completed | Demo login for Founder, HR Manager, IT Engineer, Project Coordinator, and Employee roles. |
| **IT Service Desk** | ✅ Completed | Single-screen compact view, Tickets Queue, Approval Center, Data Transfer Requests, Assets Breakdown, SLA Compliance tracking. |
| **HRMS Operations** | ✅ Completed | Employee Directory, Candidate Pipeline, Campus Interviews, Leave Management, Attendance Tracking, Meetings Calendar, HR Reports. |
| **Founder Executive Dashboard** | ✅ Completed | Top 6 Key Metrics row, HR Overview split, IT Overview split, Today's Schedule timeline, Weekly Attendance bar chart, Recruitment Funnel, IT Donut charts, 1-Click Quick Actions. |
| **Design System & UX** | ✅ Completed | Sleek dark mode (`#09090b`), Uppercase monospace typography, Handcrafted compact cards, Zero-scroll single viewport optimization (`h-screen overflow-hidden`). |
| **Real-Time Team Chat (Slack/Discord)** | 🚀 Planned (Next) | Channel creation, Direct Messaging, Ticket linking, File attachment, Notification badges. |

---

## 3. Comprehensive Role Workflows & Interactions

### 3.1 Multi-Department Employees (Ticket Raising)
- **Trigger**: Computer crash, VPN failure, software access request, or hardware fault in any department.
- **Action**: Employee clicks **"New Ticket"** on their interface.
- **Payload**: Subject, Category (Hardware, Software, Network, VPN, Data), Priority (Low, Medium, High, Critical), Description.
- **Routing**: Instant notification pushed to the **IT Service Desk Queue** and relevant Slack/Discord `#it-support` channel.

### 3.2 IT Department (Issue Resolution & Asset Management)
- **Ticket Lifecycle**: `Open` → `In Progress` → `Waiting for Approval` (if needed) → `Resolved` / `Closed`.
- **Founder Permission Ping**: If an IT request requires elevated security clearance or budget (e.g. Server Data Backup Transfer or Laptop Requisition), IT clicks **"Request Founder Approval"**.
- **Asset Control**: Tracks laptops, desktops, servers, switches, and printers. Next maintenance schedules alerted automatically.

### 3.3 HR Department (Talent, Attendance & Placements)
- **Recruitment Pipeline**: Sourcing → Screening → HR Round → Technical Round → Final Interview → Offer Sent → Joined.
- **Campus Placement Drives**: College candidate intake tracking, interview follow-ups, automated status badges.
- **Leave Governance**: HR approves leaves for all employees. Leaves requested by HR/IT leads automatically route to the Founder.

### 3.4 Project Coordinator (Design, Dev & Founder Synchronization)
- **Project Setup**: Creates multi-disciplinary projects, assigns milestone deadlines.
- **Task Delegation**: Assigns specific tasks to Designers and Developers with priority tags.
- **Resource Tracking**: Monitors code commits, design link drops, and asset availability.

### 3.5 Founder (Super Admin & Approval Authority)
- **Global Overview**: Real-time status of HR pipeline, IT health, server uptime, and active project tasks.
- **Approval Queue**: Single-click **Approve** or **Decline** for elevated leave requests, data transfers, IT purchases, and offer letters.

---

## 4. Mermaid Flowcharts & Architecture Diagrams

### Diagram 1: High-Level System Architecture & Cross-Department Integration

```mermaid
flowchart TD
    subgraph Users ["🏢 Organization Users & Roles"]
        EMP["Department Employees\n(Sales, Marketing, Dev, etc.)"]
        HR["HR Team\n(Payal Shah & Team)"]
        IT["IT Support Team\n(Meera & Engineers)"]
        PC["Project Coordinator\n(Tasks & Milestone Lead)"]
        FND["Founder / Super Admin\n(Executive Governance)"]
    end

    subgraph CoreModules ["⚙️ Unified Portal Core Engine"]
        AUTH["RBAC & Auth Engine"]
        TICKETING["Multi-Dept IT Ticketing"]
        APPROVALS["Founder Permission & Governance Engine"]
        HRMS["HRMS, Placements & Attendance"]
        PROJECTS["Coordinator Project & Task Engine"]
        CHAT["Discord/Slack-like Real-Time Chat Hub"]
    end

    EMP -->|1. Raise Ticket / Request| TICKETING
    HR -->|2. Manage Pipeline & Attendance| HRMS
    IT -->|3. Resolve Tickets & Manage Assets| TICKETING
    IT -->|4. Request Elevated Clearance| APPROVALS
    PC -->|5. Coordinate Projects & Tasks| PROJECTS
    FND -->|6. Review & 1-Click Approve/Decline| APPROVALS
    
    TICKETING <--> CHAT
    HRMS <--> CHAT
    PROJECTS <--> CHAT
    APPROVALS --> FND
```

---

### Diagram 2: Multi-Department IT Ticketing & Escalation Flowchart

```mermaid
flowchart LR
    A["Employee Encounters Issue\n(Sales / HR / Finance / Dev)"] --> B["Click 'New Ticket' & Submit Form"]
    B --> C["Ticket Generated (INC-102X)"]
    C --> D{"Notification Sent to IT Desk"}
    
    D --> E["IT Engineer Reviews Ticket Queue"]
    E --> F{"Is Elevated Permission Required?\n(Data Transfer / Hardware Purchase)"}
    
    F -- Yes --> G["Send Permission Ping to Founder"]
    G --> H["Founder Reviews in Approval Center"]
    H -- Approved --> I["IT Executes Request & Resolves Ticket"]
    H -- Declined --> J["Ticket Marked Declined with Reason"]
    
    F -- No --> I
    I --> K["Employee Notified: Ticket Resolved"]
```

---

### Diagram 3: Founder Approval & Permission Governance Flowchart

```mermaid
flowchart TD
    subgraph Requisitions ["Incoming Approval Requisitions"]
        REQ1["IT Data Transfer Request"]
        REQ2["High-Budget Hardware Requisition"]
        REQ3["HR / IT Manager Leave Request"]
        REQ4["Final Candidate Offer Letter Approval"]
    end

    subgraph FounderEngine ["Founder Dashboard Approval Center"]
        PUSH["Instant Real-Time Bell Notification Push"]
        DISP["Display Summary Card + Requester Info"]
        ACTION{"Founder Action"}
    end

    REQ1 --> PUSH
    REQ2 --> PUSH
    REQ3 --> PUSH
    REQ4 --> PUSH
    
    PUSH --> DISP
    DISP --> ACTION
    
    ACTION -- "Click Approve" --> APP["Status: APPROVED\nSystem Executes Action & Notifies Team"]
    ACTION -- "Click Decline" --> DEC["Status: DECLINED\nSystem Logs Reason & Reverts Request"]
```

---

### Diagram 4: HR Recruitment, Campus Placement & Attendance Flowchart

```mermaid
flowchart TD
    subgraph Sourcing ["1. Sourcing & Campus Drives"]
        CAMPUS["College Placement Drive Intake"]
        PORTAL["Direct Portal / Resume Sourcing"]
    end

    subgraph Pipeline ["2. Candidate Evaluation Pipeline"]
        APP["Applied"] --> SCR["Screening"]
        SCR --> HR_R["HR Round"]
        HR_R --> TECH["Technical Round"]
        TECH --> FINAL["Final Interview (Founder/HR)"]
    end

    subgraph Onboarding ["3. Offer & Onboarding"]
        FINAL --> OFFER["Offer Letter Issued"]
        OFFER --> JOIN["Candidate Joined"]
        JOIN --> EMP_RECORD["Create Employee Record in HRMS"]
    end

    subgraph Operations ["4. Daily HR Operations"]
        ATT["Daily Attendance Tracking"]
        LEAVE["Leave Request Management"]
        REPORTS["Monthly HR Analytics & Logs"]
    end

    CAMPUS --> APP
    PORTAL --> APP
    EMP_RECORD --> ATT
    EMP_RECORD --> LEAVE
    EMP_RECORD --> REPORTS
```

---

### Diagram 5: Project Coordinator & Team Collaboration Flowchart

```mermaid
flowchart LR
    A["Project Coordinator"] --> B["Create New Project\n(e.g., Portal V2 Upgrade)"]
    B --> C["Breakdown into Tasks & Milestones"]
    
    C --> D["Assign Tasks to Designers"]
    C --> E["Assign Tasks to Developers"]
    
    D --> F["Upload Figma Links / Design Assets"]
    E --> G["Commit Code & Link Pull Requests"]
    
    F --> H["Coordinator Audits Quality"]
    G --> H
    
    H --> I["Update Founder on Project Health Status"]
```

---

### Diagram 6: Discord/Slack-like Real-Time Communication Hub Architecture

```mermaid
flowchart TD
    subgraph Channels ["Public & Department Channels"]
        CH_GEN["#general - All Hands"]
        CH_IT["#it-support - Live Ticket Feed"]
        CH_HR["#hr-announcements - Policies & Events"]
        CH_PROJ["#project-alpha - Coordinator & Dev Room"]
    end

    subgraph DirectMessage ["1-on-1 Direct Messaging"]
        DM1["Employee ↔ IT Support"]
        DM2["HR Manager ↔ Founder"]
        DM3["Coordinator ↔ Developer"]
    end

    subgraph IntegratedFeatures ["Contextual Rich Features"]
        LINK_TICKET["Embed Ticket Cards directly in Chat"]
        LINK_ASSET["Share Design/Data Files securely"]
        NOTIF_SYNC["Sync Chat Alerts with System Bell"]
    end

    CH_GEN --> IntegratedFeatures
    CH_IT --> IntegratedFeatures
    CH_HR --> IntegratedFeatures
    CH_PROJ --> IntegratedFeatures
    DirectMessage --> IntegratedFeatures
```

---

## 5. Next Steps & Implementation Roadmap

1. **Integrated Multi-Department Ticket Modal**: Enable any logged-in user across HR, Sales, Coordinator, or Engineering to trigger a universal "Raise Ticket" modal from their header bar.
2. **Real-Time Team Chat Component**: Build the Discord/Slack-like chat drawer component (`TeamChat.jsx`) with channel switching, direct messaging, and ticket link embeds.
3. **Founder Approval Center Push Sync**: Connect all data transfer, hardware, and leave requests into a unified Founder Approval drawer with instant 1-click decision buttons.
