# 🏢 Fute Services — Project Ticket Dashboard: Complete System Breakdown

---

## 🔑 System ka Basic Idea (What Is This?)

Yeh ek **internal company management system** hai **Fute Services** ke liye.
Ek hi login page se **5 alag roles** ke log login karte hain — aur har role ko apna unique dashboard milta hai.

```
Login Page
    │
    ├── Founder         ──► Founder Dashboard (apna alag admin view)
    ├── HR              ──► HR Dashboard (employee, recruitment, attendance)
    ├── IT              ──► IT Dashboard (tickets, assets, approvals)
    ├── Coordinator     ──► Coordinator Dashboard (projects, tasks)
    └── Employee        ──► Employee Dashboard (apne tickets, tasks)
```

---

## 🔐 1. Authentication System — Kaisa Kaam Karta Hai?

**File:** [`AuthContext.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/context/AuthContext.jsx) + [`dummyAuth.js`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/utils/dummyAuth.js)

### Login Flow:
1. User apna **email + password** enter karta hai.
2. System pehle **real backend** se try karta hai.
3. Agar backend nahi chala → automatically **demo accounts** se fallback ho jaata hai.
4. Login successful hone par `homeFor(role)` function decide karta hai ki user ko kahan bhejna hai:

| Role | Redirect Hota Hai |
|------|------------------|
| `founder` | `/founder/dashboard` |
| `hr` | `/hr/overview` |
| `it` | `/it/dashboard` |
| `coordinator` | `/coordinator/overview` |
| `employee` | `/employee/dashboard` |

### Demo Accounts (Quick Login Buttons):
```
Founder    → founder@futeservices.com     / demo1234
HR         → hr.demo@futeservices.com     / demo1234
IT         → system.demo@futeservices.com / demo1234
Coordinator→ coordinator.demo@futeservices.com / demo1234
Employee   → employee@futeservices.com    / demo1234
```

### "Remember Me" Kaisa Kaam Karta Hai:
- **Checked** → `localStorage` mein save hota hai → Browser band karne ke baad bhi logged in rehta hai.
- **Unchecked** → `sessionStorage` mein save hota hai → Tab close karte hi logout ho jaata hai.

---

## 👑 2. FOUNDER Dashboard

**File:** [`FounderDashboardPage.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/FounderDashboardPage.jsx)

### Kya Hai Yeh Dashboard?
Founder ka dashboard ek **executive command center** hai. Isme Apple-style floating left sidebar (Apple Dock) hai jisse departments switch kar sakte hain.

### Left Apple Dock Navbar:
- **Founder Overview** (Crown icon) — Apni aur leadership team ki overview
- **HR** — HR department ka live view
- **IT** — IT service desk ka view
- **Sales** — Sales operations
- **Developers** — Developer portal
- **Marketing** — Marketing hub
- **Branding** — Branding hub
- **Production** — Production tracking
- **Team Chat** — Live team chat drawer
- **Sign Out** — Logout

### Sections / Tabs:

#### 📌 Overview Tab:
- Leadership team cards (Ratish Kovvammal - CEO, Payel Saha - COO, Soma - MD)
- Company stats (employees, departments, active projects)
- Recent notifications & Bell icon

#### 📋 Approval Tab (Founder Approvals):
- File: [`FounderApprovalView.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/FounderApprovalView.jsx)
- IT se aaye requests ko Founder **Approve / Reject** kar sakta hai
- HR se aaye leave requests bhi yahaan handle hoti hain
- Status badges: `Pending Founder` (Amber), `Approved` (Green), `Rejected` (Red)

#### 📊 Reports Tab:
- File: [`FounderReportsView.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/FounderReportsView.jsx)
- HR ke employees, attendance, offers ka data charts mein dikhta hai
- IT tickets ka SLA compliance, resolution time dikhta hai

#### 👥 HR Tab:
- File: [`FounderHrView.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/FounderHrView.jsx)
- Founder ko HR portal ka read-only view milta hai
- Employee list, candidates, attendance — sab dikhta hai

#### 💻 IT Tab:
- File: [`FounderItView.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/FounderItView.jsx)
- Founder ko IT ka overview — tickets, assets, approvals
- Founder yahaan se IT requests approve/reject karta hai

---

## 💻 3. IT Dashboard (DashboardPage)

**File:** [`DashboardPage.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/DashboardPage.jsx) (761 lines!)

Yeh **IT Department** ka main dashboard hai. Isme **top horizontal navbar** hai jisme 5 tabs hain:

### Tabs:

#### 📊 Dashboard (Main Overview):
- **6 Stat Cards** — Total Tickets, Open, Pending Approval, Resolved, In Progress, SLA Compliance
- **2 Donut Charts:**
  - Tickets by Category (Laptop/Desktop, Network, Software, VPN, Data)
  - Tickets by Status (Open, In Progress, Waiting Approval, Resolved, Closed)
- **Assets Quick Overview** — Laptops, Desktops, Servers, Network, Printers count

#### 🎫 Tickets Queue:
- Saare tickets ek table mein
- Filter by status: All / Open / In Progress / Waiting Approval / Resolved / Closed
- **IT Agent har ticket ka status change kar sakta hai** (dropdown se)
- Employee ka ticket yahaan real-time aata hai (shared state ke through)

#### ✅ Approval Center:
- IT jo requests Founder ko bhejna chahta hai, yahaan form fill karta hai:
  - Request Title, Requested By, Details, Priority
  - "Send for Founder Approval" button → request founder ke dashboard mein jaati hai
- **Awaiting Founder Sign-off:** Pending requests list
- **Decision History:** Founder ne approve/reject kya, woh record

#### 🖥️ Data Requests:
- Server-to-server data transfer requests manage hoti hain
- Status: Open / In Progress / Completed / Waiting Approval
- "New Data Request" button → modal khulta hai jisme source server, destination, folder specify karte hain

#### 🏷️ Asset Management:
- Company ke saare IT assets ka complete inventory:
  - Laptops, Desktops, Servers, Network devices, Printers
  - Asset ID, Model, Assigned To, Department, Purchase Date, Warranty End, Status
- **Search** by asset ID/model/user/department
- **Filter** by asset type
- **Add Asset** — naya asset add karo
- **Edit Asset** — existing update karo
- **Delete Asset** — hatao
- Warranty expire hone wale assets highlight hote hain (amber color)

#### 📈 Reports & Logs:
- **4 KPI Cards:** SLA Compliance %, Total Resolved, SLA Breaches, Avg Resolution Time
- **Weekly Bar Chart:** Har week met vs breached tickets
- **Resolution Time by Category:** Category-wise average hours horizontal bar chart
- **Export CSV button** — data download kar sakte hain

---

## 👩‍💼 4. HR Dashboard

**Files in:** [`pages/hr/`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/)

### Sub-pages:

| Page | Kya Hai |
|------|---------|
| [`Overview.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Overview.jsx) | HR summary — headcount, open positions, attendance rate |
| [`Candidates.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Candidates.jsx) | Recruitment pipeline — candidates track karna |
| [`Interviews.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Interviews.jsx) | Interview schedule aur outcomes |
| [`Attendance.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Attendance.jsx) | Employee daily attendance records |
| [`Directory.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Directory.jsx) | Full employee directory |
| [`Email.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Email.jsx) | HR internal email/communication |
| [`Reports.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/hr/Reports.jsx) | HR analytics reports |

---

## 📋 5. Coordinator Dashboard

**Files in:** [`pages/coordinator/`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/coordinator/)

### Sub-pages:

| Page | Kya Hai |
|------|---------|
| [`Overview.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/coordinator/Overview.jsx) | Projects + tasks ka summary |
| [`Tasks.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/coordinator/Tasks.jsx) | Task board — assign, track, update |
| [`Projects.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/coordinator/Projects.jsx) | Project list |
| [`ProjectDetail.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/coordinator/ProjectDetail.jsx) | Single project detail view |

---

## 👤 6. Employee Dashboard

**File:** [`EmployeeDashboardPage.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/EmployeeDashboardPage.jsx)

### Tabs:

#### 🎫 My Tickets:
- Employee apne submitted tickets dekh sakta hai
- **"Raise Ticket" button** — modal opens, title, department, description fill karke submit
- Ticket submit hone ke baad **IT Dashboard ke Ticket Queue mein turant dikhta hai** (shared context)
- Status real-time update hota hai

#### ✅ My Tasks & Projects:
- Employee ko assign hue tasks dikhaata hai
- Coordinator jo tasks assign karta hai, woh yahaan appear hote hain

---

## 🔄 7. Data Flow — Kaise Ek Jagah ka Change Doosri Jagah Dikhta Hai?

```
Employee → Raises IT Ticket
              ↓ (TicketContext.jsx — shared global state)
IT Dashboard → Ticket Queue mein dikhta hai
IT Agent → Status change karta hai
              ↓ (same TicketContext)
Employee → My Tickets mein updated status dikhta hai ✅

IT Agent → Approval Request submit karta hai
              ↓ (ApprovalContext.jsx — shared global state)
Founder Dashboard → Approval Center mein dikhta hai
Founder → Approve/Reject karta hai
              ↓ (same ApprovalContext)
IT Dashboard → Decision History mein record dikhta hai ✅
```

### Context Files (Global State):
| Context | Purpose |
|---------|---------|
| [`AuthContext.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/context/AuthContext.jsx) | Login/logout, user info, role-based routing |
| [`TicketContext.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/context/TicketContext.jsx) | IT tickets — employee se IT tak shared |
| [`ApprovalContext.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/context/ApprovalContext.jsx) | IT → Founder approval requests |
| [`LeaveContext.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/context/LeaveContext.jsx) | Leave requests (HR + Founder) |
| [`TaskProjectContext.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/context/TaskProjectContext.jsx) | Tasks/projects (Coordinator → Employee) |

---

## 🧱 8. Key Components

| Component | Kya Karta Hai |
|-----------|---------------|
| [`AppleDock.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/AppleDock.jsx) | Founder ka left floating dock navbar — department switcher + logout |
| [`ItDeskLayout.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/ItDeskLayout.jsx) | IT aur Employee ka top navbar layout wrapper |
| [`DataTable.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/DataTable.jsx) | Reusable sortable, paginated data table |
| [`DonutChart.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/DonutChart.jsx) | SVG donut chart — tickets by category/status |
| [`TeamChatDrawer.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/TeamChatDrawer.jsx) | Right-side slide-in team chat panel |
| [`DataTransferModal.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/DataTransferModal.jsx) | Server data transfer request modal |
| [`AssetFormModal.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/AssetFormModal.jsx) | Add/Edit IT asset modal form |
| [`NewItTicketModal.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/NewItTicketModal.jsx) | Employee ke liye new ticket raise modal |
| [`RequireAuth.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/RequireAuth.jsx) | Route guard — role check, unauthorized ko block |
| [`ui.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/ui.jsx) | Reusable UI: Card, StatCard, Badge, SectionHeader |

---

## 🔒 9. Route Protection — Unauthorized Access Kaise Rokta Hai?

**File:** [`RequireAuth.jsx`](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/RequireAuth.jsx)

- Har protected route pe `<RequireAuth allow={['role']}>` wrapper lagta hai
- Agar user logged-in nahi hai → `/` (login) pe redirect
- Agar user logged-in hai but wrong role hai → uski apni home pe redirect
- Example: Employee agar `/founder/dashboard` manually URL daale → automatically `/employee/dashboard` pe bhej diya jaata hai

---

## 🎨 10. Design System

- **Dark glassmorphic theme** — `#101014` / `#141418` / `#18181c` backgrounds
- **Accent color** — `#e86024` (orange) — buttons, highlights, active states
- **Role-based color coding:**
  - Founder: Amber/Orange
  - HR: Blue/Indigo
  - IT: Cyan
  - Sales: Emerald
  - Developers: Purple
  - Marketing: Orange
  - Branding: Pink
- **Micro-animations** — hover scale, tooltip slides, dock magnify effect
- **Google Fonts** style typography — font-black headings, tracking-tight

---

## 📁 Complete File Map

```
frontend/src/
├── pages/
│   ├── LoginPage.jsx              ← Login (sab roles)
│   ├── DashboardPage.jsx          ← IT Dashboard (761 lines)
│   ├── FounderDashboardPage.jsx   ← Founder Dashboard
│   ├── EmployeeDashboardPage.jsx  ← Employee Dashboard
│   ├── hr/                        ← 7 HR sub-pages
│   └── coordinator/               ← 4 Coordinator sub-pages
├── components/
│   ├── AppleDock.jsx              ← Founder left dock
│   ├── ItDeskLayout.jsx           ← IT/Employee navbar
│   ├── FounderApprovalView.jsx    ← Founder approval panel
│   ├── FounderHrView.jsx          ← Founder HR read view
│   ├── FounderItView.jsx          ← Founder IT read view
│   ├── FounderReportsView.jsx     ← Founder analytics
│   ├── DataTable.jsx              ← Sortable table
│   ├── DonutChart.jsx             ← SVG chart
│   ├── TeamChatDrawer.jsx         ← Chat sidebar
│   └── ...modals
├── context/
│   ├── AuthContext.jsx            ← Login state
│   ├── TicketContext.jsx          ← Tickets (shared)
│   ├── ApprovalContext.jsx        ← Approvals (shared)
│   ├── LeaveContext.jsx           ← Leaves (shared)
│   └── TaskProjectContext.jsx     ← Tasks/Projects (shared)
└── utils/
    ├── api.js                     ← Backend API calls
    └── dummyAuth.js               ← Offline demo accounts
```

---

> **Summary in one line:** Yeh ek role-based company management portal hai jisme Founder, HR, IT, Coordinator, aur Employee — sab apna apna portal use karte hain, aur real-time shared state ke through ek doosre ke actions ko impact karte hain.
