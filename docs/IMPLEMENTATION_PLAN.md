# Implementation Plan - IT & Production Dashboard Enhancements

This plan details the technical steps to restructure the **Production Floor Dashboard** into a stateful, interactive view and upgrade the **IT Service Desk** views (Tickets, Assets, Data Requests, and Approvals) with the data fields, filters, routing rules, and history tracking systems outlined in the notebook guidelines.

---

## User Review Required

### Key Architecture Decisions:
1. **Production Floor Interactive View**: The Production Floor page (`/department/production` route) is currently a read-only view reusing `FounderDeptView.jsx` with static mock data. We will replace this with a stateful component `ProductionDashboardView.jsx` that handles live in-memory render lists, form submissions, and direct IT ticket generation.
2. **Cross-Department Ticket Reporting**: When a user on the Production Floor clicks "Report Issue to IT", it will inject a prefilled ticket into the shared `TicketContext`. This means the IT desk will instantly see rendering issues raised by production personnel in their main queue.
3. **Data Request Approvers**: We will route approvals involving `Server 100` to `Payel Ma'am` and `Server 121` to `Rathish sir` by creating actual approval records in `ApprovalContext`, which will dynamically appear in their respective dashboards.

---

## Proposed Changes

### 🎥 Production Floor Dashboard
We will create a fully interactive rendering dashboard for the Production team.

#### [NEW] [ProductionDashboardView.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/ProductionDashboardView.jsx)
Create a new state-backed rendering control view:
- **State Management**: Local state `renders` initialized with mock rendering tasks.
- **KPI Metrics Cards**:
  - "Total Frame Renders" (sum of all frames currently rendering/complete).
  - "Allocated Systems" (number of active render systems).
- **Update Render Frame Form**:
  - Inputs: `Project Code` (text), `Sequence Type` (select: `Steel` | `Animal` | `360`), `Frame No` (text, e.g. `100-300`), `Name of Person` (text), `Date` (date picker, defaults to today), `Allocated Systems` (number, default 1).
  - Handles submission: Appends a new render node job to the stateful list, recalculates stats.
- **Rendering Queue Grid**:
  - Displays a tabular list of jobs with columns: `Project Code`, `Sequence`, `Frame No`, `Date`, `Systems`, `Status (Completed / Rendering)`.
  - Allow toggling the status of a job (Complete vs. Rendering).
- **"Report to IT" Action**:
  - Clicking this button will display a modal to raise an IT support ticket (e.g. "Render Node Server 70 GPU Crash").
  - Connects to `useTickets` context to push the ticket directly into the IT Service Desk Queue.

#### [MODIFY] [DepartmentDashboardPage.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/DepartmentDashboardPage.jsx)
- Import the new `<ProductionDashboardView />` component.
- In the main container, check if `user?.role === 'production'`:
  - If true, render `<ProductionDashboardView />`.
  - Otherwise, fallback to the standard `<FounderDeptView dept={dept} />` (used by Sales, Developers, Marketing, and Branding).

---

### 🔒 IT Service Desk: Data Requests routing

#### [MODIFY] [DataTransferModal.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/DataTransferModal.jsx)
- Add form fields:
  - `requesterName` (Name)
  - `requesterNumber` (Phone / Contact Number)
  - `backupName` (Backup name to display in details)
  - `priority` (select: `Low` | `Medium` | `High` | `Critical`)
- Adjust `handleSubmit` payload to include these new fields.

#### [MODIFY] [DashboardPage.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/DashboardPage.jsx)
- **Data Requests View Expansion**:
  - Modify `DataRequestsView` to render requests inside an expandable accordion or card.
  - Show full metadata when expanded: `Requester Contact`, `Backup Name`, `Priority`, and `Target Approver`.
- **Enforce Dynamic Server Rules on Submission**:
  - Update `handleNewDataRequest` to apply rules based on selected source/destination servers:
    - If `Server 100` is selected: Set approver = `"Payel Ma'am (HR Manager)"` and status = `"Waiting Approval"`. Create approval entry.
    - If `Server 121` is selected: Set approver = `"Rathish sir (Founder)"` and status = `"Waiting Approval"`. Create approval entry.
    - If `Server 70` is selected: Auto-apply tag `"Priority Wise"`.
    - If `Server 50` is selected: Auto-apply tag `"Tag Every Time"`.
    - If `Server 131` is selected: Auto-apply tag `"Standard Queue"`.

---

### 💻 IT Service Desk: Asset Management

#### [MODIFY] [itMockData.js](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/data/itMockData.js)
- Extend assets objects to include:
  - `hardDisk` (e.g. `256GB SSD`, `1TB NVMe SSD`)
  - `componentsList` (array of hardware components: RAM, GPU, CPU specs)
  - `componentsLog` (array of audit events: e.g., `[{ date: '2026-08-10', change: 'Upgraded RAM from 8GB to 16GB' }]`)
  - `history` (array of assignment/repair event objects: e.g., `[{ date: '2026-08-01', event: 'Assigned to Priya Nair' }]`)

#### [MODIFY] [AssetFormModal.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/AssetFormModal.jsx)
- Add input field for **Assigned Hard Disk**.
- Add text area for **Components Inventory** (RAM, CPU, GPU, etc.).
- When saving an edited asset, check if components or status changed:
  - If so, automatically append a record to the `componentsLog` or `history` timeline.

#### [MODIFY] [DashboardPage.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/DashboardPage.jsx) (inside `AssetsView` component)
- Add a dedicated **Asset ID search input** above the table to filter results instantly.
- Modify the DataTable row rendering to make rows clickable.
- When a row is clicked, display an **Asset Audit Sidebar** or expansion containing:
  - **Component Inventory**: Displays assigned Hard Disk and details.
  - **Components Change Log**: Bulleted audit list of hardware changes.
  - **Asset Allocation History**: Chronological history timeline.

---

### 🎫 IT Service Desk: Ticket Queue & Approvals Sorting

#### [MODIFY] [DashboardPage.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/DashboardPage.jsx)
- **Tickets Queue Columns Upgrade**:
  - In `TicketsQueueView`, expand the DataTable columns to include:
    - **Employee ID**
    - **VPN No**
    - **Date**
    - **Username**
    - **Department**
  - Implement a responsive details modal/drawer when clicking a ticket to inspect all fields cleanly without cluttering the main grid.
  - Update `initialTickets` in `itMockData.js` to contain dummy values for these attributes.
  - Update `addTicket` in `TicketContext.jsx` to append these details on ticket creation.
- **Approval Center Filters & Sorting**:
  - In `ApprovalCenterView`, add a toolbar with:
    - Sort order selector: `Datewise` (Newest first | Oldest first).
    - Status Filter selector: `All` | `Pending` | `Resolved`.
    - Priority Filter selector: `All` | `High` | `Medium` | `Low`.
    - Issue Category / Source selector.
  - Apply these filters and sort parameters to the approvals before rendering the grids.

---

## Verification Plan

### Automated Tests
- Validate compilation: Run `npm run build` inside `main/frontend` to verify there are no JSX, typescript, or ESLint errors.

### Manual Verification
1. **Production Dashboard**: Log in as `production.demo@futeservices.com` and verify the rendering status dashboard. Add a new render job and confirm it updates stats. Click "Report to IT" and raise a ticket.
2. **IT Ticket Queue**: Log in as IT Admin, check the Tickets tab, and confirm that the new ticket raised from Production is in the queue showing `Employee ID`, `VPN No`, `Date`, `Username`, and `Department`.
3. **Data Request Rules**: Submit a data transfer request using `Server 100` or `Server 121` and verify that the approval routing is updated (e.g. routes to Payel Ma'am / Rathish sir). Verify that `Server 70`/`50` requests carry the correct priority/standard tags.
4. **Asset History**: Edit an asset's components and status, open the asset drawer, and confirm that the change is logged in the timeline. Filter assets specifically by `Asset ID`.
5. **Approvals sorting**: Navigate to the IT Approval Center tab and test sorting approvals by Date and filtering by priority, status, and category.
