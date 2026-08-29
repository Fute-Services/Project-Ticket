# Implementation Plan - IT & Production Dashboard Enhancements

This plan explains, step by step, the technical work needed to turn the **Production Floor Dashboard** from a static, read-only screen into a live, interactive one, and to upgrade the **IT Service Desk** screens (Tickets, Assets, Data Requests, and Approvals) with the extra information fields, filters, routing rules, and history-tracking that the notebook guidelines called for.

---

## User Review Required

### Key Architecture Decisions (the big-picture choices this plan is built on):
1. **Production Floor Interactive View**: The Production Floor page (found at the web address `/department/production`) currently just displays fixed sample data using the same component (a reusable building-block of the website) that other departments use, called `FounderDeptView.jsx`, so it never actually changes. We will replace it with a new, purpose-built component called `ProductionDashboardView.jsx` that keeps track of real render jobs (a "render" is a video/graphics job being processed) as they happen, lets people fill in and submit forms, and lets them raise IT tickets directly from the screen.
2. **Cross-Department Ticket Reporting**: When someone on the Production Floor clicks "Report Issue to IT," the system will automatically create a ready-filled support ticket inside the shared ticket system (`TicketContext`, the part of the app that keeps every department's tickets in sync). In practice, this means the IT desk will see rendering problems raised by the production team show up in their main queue immediately, without anyone needing to re-type or forward anything.
3. **Data Request Approvers**: Certain requests need sign-off from a specific person depending on which server is involved. Requests touching `Server 100` will be routed to `Payel Ma'am`, and requests touching `Server 121` will be routed to `Rathish sir`. This will work by creating an actual approval record behind the scenes (in `ApprovalContext`, the part of the app that manages pending approvals), which then automatically shows up on that person's own dashboard for them to approve or reject.

---

## Proposed Changes

### 🎥 Production Floor Dashboard
We will build a fully interactive screen for the Production team to manage rendering jobs.

#### [NEW] [ProductionDashboardView.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/ProductionDashboardView.jsx)
This is a brand-new screen that remembers and updates its own data as people use it:
- **Keeping track of the data**: The screen holds a list called `renders`, starting out with some sample rendering jobs to demonstrate how it works.
- **Summary number cards at the top**:
  - "Total Frame Renders" - adds up every frame that is currently rendering or already finished.
  - "Allocated Systems" - shows how many render computers are currently in use.
- **A form to update a render job**:
  - What you can fill in: `Project Code` (a text box), `Sequence Type` (a dropdown list to choose from: `Steel`, `Animal`, or `360`), `Frame No` (a text box, e.g. `100-300`), `Name of Person` (a text box), `Date` (a date picker, automatically set to today), and `Allocated Systems` (a number, starting at 1).
  - What happens when you submit it: a new render job gets added to the list on screen, and the summary numbers at the top update right away.
- **The list of render jobs**:
  - Shown as a table with columns for `Project Code`, `Sequence`, `Frame No`, `Date`, `Systems`, and `Status` (either Completed or Rendering).
  - You can click to flip a job's status between Complete and Rendering.
- **A "Report to IT" button**:
  - Clicking it opens a small popup window (a "modal") to describe an IT problem (for example, "Render Node Server 70 GPU Crash").
  - Behind the scenes, this connects to the same ticket system IT already uses (`useTickets`), so the new ticket lands straight in the IT Service Desk's queue.

#### [MODIFY] [DepartmentDashboardPage.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/DepartmentDashboardPage.jsx)
- Bring in the new `<ProductionDashboardView />` screen described above.
- On this page, check who is logged in: if their role is `production`,
  - show them the new `<ProductionDashboardView />` screen.
  - Otherwise, keep showing the existing, simpler screen (`<FounderDeptView dept={dept} />`), which is still used by the Sales, Developers, Marketing, and Branding departments.

---

### 🔒 IT Service Desk: Data Requests routing

#### [MODIFY] [DataTransferModal.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/DataTransferModal.jsx)
- Add these fields to the request form:
  - `requesterName` (the requester's name)
  - `requesterNumber` (their phone or contact number)
  - `backupName` (the name of the backup, shown in the request's details)
  - `priority` (a dropdown to choose: `Low`, `Medium`, `High`, or `Critical`)
- Make sure these new fields are actually included when the form is submitted.

#### [MODIFY] [DashboardPage.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/DashboardPage.jsx)
- **Making the Data Requests list show more detail**:
  - Change how each request is displayed so it can expand open (like an accordion or an expanding card) to reveal more information.
  - When expanded, show the `Requester Contact`, `Backup Name`, `Priority`, and `Target Approver` (who needs to sign off on it).
- **Automatically applying the right rule when a request is submitted**:
  - Depending on which server the request involves, apply these rules automatically:
    - `Server 100`: the approver is set to `"Payel Ma'am (HR Manager)"`, and the request's status becomes `"Waiting Approval"`. An approval record is created for her to review.
    - `Server 121`: the approver is set to `"Rathish sir (Founder)"`, and the request's status becomes `"Waiting Approval"`. An approval record is created for him to review.
    - `Server 70`: automatically labeled with the tag `"Priority Wise"`.
    - `Server 50`: automatically labeled with the tag `"Tag Every Time"`.
    - `Server 131`: automatically labeled with the tag `"Standard Queue"`.

---

### 💻 IT Service Desk: Asset Management

#### [MODIFY] [itMockData.js](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/data/itMockData.js)
- Add more detail to each piece of IT equipment ("asset") stored in the system:
  - `hardDisk` - what storage it has (for example, `256GB SSD` or `1TB NVMe SSD`).
  - `componentsList` - a list of its hardware parts (RAM amount, graphics card, processor details, etc.).
  - `componentsLog` - a running history of hardware changes made to it (for example: `[{ date: '2026-08-10', change: 'Upgraded RAM from 8GB to 16GB' }]`).
  - `history` - a running history of who it was assigned to or repairs made (for example: `[{ date: '2026-08-01', event: 'Assigned to Priya Nair' }]`).

#### [MODIFY] [AssetFormModal.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/components/AssetFormModal.jsx)
- Add a field for **which hard disk is assigned** to the asset.
- Add a text box for listing its **hardware components** (RAM, processor, graphics card, etc.).
- When someone edits and saves an asset, check whether its components or status changed:
  - If something changed, automatically add an entry to its change log or history so there is a record of what happened and when.

#### [MODIFY] [DashboardPage.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/DashboardPage.jsx) (inside the `AssetsView` part of the page)
- Add a search box specifically for **Asset ID** above the table, so results filter instantly as you type.
- Make each row in the assets table clickable.
- When a row is clicked, open a side panel or expanded section showing:
  - **What's inside it**: the assigned hard disk and other component details.
  - **What's changed over time**: a bulleted list of hardware changes.
  - **Where it's been**: a timeline of who it was assigned to and when.

---

### 🎫 IT Service Desk: Ticket Queue & Approvals Sorting

#### [MODIFY] [DashboardPage.jsx](file:///d:/Project-ticket/Project-Ticket/main/frontend/src/pages/DashboardPage.jsx)
- **Adding more columns to the Tickets list**:
  - In the ticket queue screen (`TicketsQueueView`), add columns for:
    - **Employee ID**
    - **VPN No** (the employee's VPN identification number)
    - **Date**
    - **Username**
    - **Department**
  - When someone clicks a ticket, open a details panel or drawer so they can see every field clearly, instead of cramming everything into the table.
  - Update the sample ticket data (`initialTickets` in `itMockData.js`) so it includes example values for these new fields.
  - Make sure new tickets created through the app (`addTicket` in `TicketContext.jsx`) also save these details from the start.
- **Adding filters and sorting to the Approval Center**:
  - In the approvals screen (`ApprovalCenterView`), add a toolbar with:
    - A sort option: `Datewise` (choose Newest first or Oldest first).
    - A status filter: `All`, `Pending`, or `Resolved`.
    - A priority filter: `All`, `High`, `Medium`, or `Low`.
    - A filter for the type or source of the issue.
  - Make sure the list of approvals actually updates on screen based on whichever filters and sort order are chosen.

---

## Verification Plan

### Automated Tests
- Confirm the code still builds correctly: run `npm run build` inside the `main/frontend` folder and make sure there are no coding errors (JSX, TypeScript, or ESLint errors, i.e. the tools that check the code is written correctly).

### Manual Verification (checking things by hand, as a real user would)
1. **Production Dashboard**: Log in as `production.demo@futeservices.com` and check the rendering status dashboard looks right. Add a new render job and confirm the summary numbers update. Click "Report to IT" and raise a test ticket.
2. **IT Ticket Queue**: Log in as an IT Admin, open the Tickets tab, and confirm the new ticket raised from Production appears in the queue with the correct `Employee ID`, `VPN No`, `Date`, `Username`, and `Department`.
3. **Data Request Rules**: Submit a data transfer request using `Server 100` or `Server 121` and check the approval gets routed correctly (to Payel Ma'am or Rathish sir). Also check that requests for `Server 70` or `Server 50` get the correct priority or standard tags.
4. **Asset History**: Edit an asset's components and status, open its side panel, and confirm the change shows up in its timeline. Try filtering the asset list by `Asset ID`.
5. **Approvals sorting**: Go to the IT Approval Center tab and test sorting approvals by date, and filtering them by priority, status, and category.
