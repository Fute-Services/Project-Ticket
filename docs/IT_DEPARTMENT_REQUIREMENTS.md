# IT Department Requirements

Source: handwritten IT requirements notes, organized into a feature list.

## 1. IT Service Desk / Ticketing System
The system should allow users to raise IT support tickets under different
categories and subcategories.

## 2. Categories

### A. Laptop / Desktop / Workstation / Server Issues
Users can create tickets for:
- Laptop Hanging Issue
- Network Connection Issue
- Software Installation Request
- Software Troubleshooting
- Laptop Not Powering On
- Laptop Display Issue
- Desktop Issues
- Workstation Issues
- Server Issues
- Other Hardware/Software Issues

### B. VPN
Users should be able to:
- Request New VPN Access
- VPN Troubleshooting
- VPN Connectivity Issues

### C. Networking
Support tickets for:
- LAN Not Working
- Wi-Fi Not Working
- Network Connectivity Issues
- Remote PC Not Connecting
- Network Power Issues
- Shared Folder / Shared Path Access Issues
- New Network Request

### D. Data Request
Users can request data transfer between servers.

Examples:
- Server 70 → Server 131
- Server 50 → Server 70
- Server 50 → Server 29
- Server 50 → Server 131
- Server 29 → Server 70
- Server 29 → Server 50
- Server 29 → Server 131
- Server 70 → Server 50
- Server 70 → Server 131
- Server 70 → Server 29
- Server 131 → Server 70
- Server 131 → Server 50
- Server 131 → Server 29
- Any Server ↔ Anima
- Anima → Server 70
- Anima → Server 50
- Anima → Server 131
- Anima → Server 29

For every data transfer request, the requester must provide:
- Source Server
- Destination Server
- Folder Name
- Folder Path
- Description / Purpose of Transfer

## 3. Approval Workflow
Every new request should go through an approval process before execution.

Approval is required for:
- Software Installation
- Data Transfer
- Server Upgrade
- New Network Request
- VPN Request
- Hardware Request
- Any Infrastructure Upgrade

The dashboard should show:
- Pending Approval
- Approved Requests
- Rejected Requests
- Approval History

## 4. Ticket Details
Each ticket should capture:
- Ticket ID
- Category
- Subcategory
- Issue Description
- Priority (Low, Medium, High, Critical)
- Requester
- Department
- Assigned Engineer
- Attachments
- Status
- Created Date & Time
- Last Updated
- Resolution Notes

## 5. Ticket Status
- New
- Open
- Assigned
- In Progress
- Waiting for Approval
- Waiting for User
- Resolved
- Closed
- Reopened

## 6. Asset Management
Maintain inventory for:
- Laptops
- Desktops
- Workstations
- Servers
- Network Devices
- Printers
- Accessories

Track:
- Asset ID
- Assigned User
- Department
- Purchase Date
- Warranty
- Current Status

## 7. Dashboard
Display:
- Total Open Tickets
- Critical Tickets
- Pending Approvals
- Today's Requests
- Closed Tickets
- SLA Status
- Active Engineers
- Recent Activities
- Server/Data Transfer Requests

## 8. Notifications
Real-time notifications for:
- New Ticket Created
- Ticket Assigned
- Approval Required
- Approval Completed
- Ticket Resolved
- Data Transfer Completed
- Software Installation Completed
- VPN Request Approved/Rejected

## 9. User Roles
- Super Admin
- IT Manager
- System Administrator
- Network Engineer
- Help Desk Engineer
- Employee (Requester)
- Approver

## 10. Reports
Generate reports for:
- Ticket Summary
- Category-wise Issues
- Engineer Performance
- SLA Compliance
- Data Transfer Requests
- Approval History
- Asset Inventory
- VPN Requests
- Network Issues
- Software Installation Requests

## 11. Audit Logs
Track every activity:
- Login / Logout
- Ticket Created
- Ticket Updated
- Ticket Assigned
- Approval Given
- Approval Rejected
- Software Installed
- Data Transfer Initiated
- Data Transfer Completed
- Asset Assigned / Returned
- User Actions
- System Changes

---

## Current implementation status

The live IT flow today (`main/backend/routes/itRoutes.js`,
`main/backend/controllers/itController.js`, and the shared
`main/frontend/src/pages/DashboardPage.jsx`) is a single flat complaint
queue: IT tickets are raised, searched by token (`FT-IT-XXXXXX`), and moved
through a small status set (see `main/frontend/src/utils/tickets.js`). It
does **not** yet have:

- Category/subcategory structure (Hardware, VPN, Networking, Data Request)
- The data-transfer request form (source/destination server, folder,
  purpose) or the named server list above
- An approval workflow (pending/approved/rejected) for installs, transfers,
  server upgrades, network/VPN/hardware requests
- Priority levels, assigned engineer, attachments, or resolution notes on
  the ticket record
- The full ticket status lifecycle (New/Open/Assigned/In Progress/Waiting
  for Approval/Waiting for User/Resolved/Closed/Reopened) — currently just
  a few generic statuses
- Asset management/inventory
- A dedicated IT dashboard (open/critical ticket counts, SLA status, active
  engineers, recent activity)
- Notifications, reports, audit logs
- The IT-specific roles (IT Manager, System Administrator, Network
  Engineer, Help Desk Engineer, Approver) — today it's just the flat `it`
  role from `main/backend/controllers/authController.js`

Treat this file as the backlog/roadmap for the IT dept module, the same way
[`HR_DASHBOARD_REQUIREMENTS.md`](./HR_DASHBOARD_REQUIREMENTS.md) tracks HR.
