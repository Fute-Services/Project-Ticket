// Local, in-memory demo data for the IT service desk — mirrors
// hrMockData.js's pattern so the ticket-category taxonomy isn't hardcoded
// inline inside the "New Ticket" modal component.

export const TICKET_CATEGORIES = {
  'Laptop / Desktop / Server': [
    'Laptop Hanging Issue',
    'Network Connection Issue',
    'Software Installation Request',
    'Software Troubleshooting',
    'Laptop Not Powering On',
    'Laptop Display Issue',
    'Desktop Issues',
    'Workstation Issues',
    'Server Issues',
    'Other Hardware/Software Issues',
  ],
  VPN: ['Request New VPN Access', 'VPN Troubleshooting', 'VPN Connectivity Issues'],
  Networking: [
    'LAN Not Working',
    'Wi-Fi Not Working',
    'Network Connectivity Issues',
    'Remote PC Not Connecting',
    'Network Power Issues',
    'Shared Folder / Shared Path Access Issues',
    'New Network Request',
  ],
  'Software Requests': ['Visual Studio Code', 'Adobe Photoshop', 'AutoCAD', 'Microsoft Office', 'Other Software'],
};

export const TICKET_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

// ── Asset inventory (Asset Management tab) ────────────────────────────────
export const ASSET_TYPES = ['Laptop', 'Desktop', 'Server', 'Network', 'Printer'];
export const ASSET_STATUSES = ['In Use', 'Available', 'Under Repair', 'Retired'];

export const assets = [
  { id: 'AST-1001', type: 'Laptop', model: 'Dell Latitude 5440', assignedTo: 'John Doe', department: 'Engineering', purchaseDate: '2024-02-11', warrantyEnd: '2027-02-11', status: 'In Use' },
  { id: 'AST-1002', type: 'Laptop', model: 'MacBook Pro 14"', assignedTo: 'Priya Nair', department: 'Design', purchaseDate: '2025-06-03', warrantyEnd: '2028-06-03', status: 'In Use' },
  { id: 'AST-1003', type: 'Laptop', model: 'Lenovo ThinkPad T14', assignedTo: '—', department: 'IT Store', purchaseDate: '2023-09-20', warrantyEnd: '2026-09-20', status: 'Available' },
  { id: 'AST-2001', type: 'Desktop', model: 'HP EliteDesk 800', assignedTo: 'Jane Smith', department: 'Finance', purchaseDate: '2023-04-18', warrantyEnd: '2026-04-18', status: 'In Use' },
  { id: 'AST-2002', type: 'Desktop', model: 'Dell OptiPlex 7010', assignedTo: '—', department: 'IT Store', purchaseDate: '2022-11-05', warrantyEnd: '2025-11-05', status: 'Under Repair' },
  { id: 'AST-3001', type: 'Server', model: 'Dell PowerEdge R750 (Server 70)', assignedTo: 'Infrastructure', department: 'IT', purchaseDate: '2023-01-15', warrantyEnd: '2028-01-15', status: 'In Use' },
  { id: 'AST-3002', type: 'Server', model: 'HPE ProLiant DL380 (Server 131)', assignedTo: 'Infrastructure', department: 'IT', purchaseDate: '2024-07-22', warrantyEnd: '2029-07-22', status: 'In Use' },
  { id: 'AST-3003', type: 'Server', model: 'Dell PowerEdge R640 (Server 29)', assignedTo: 'Infrastructure', department: 'IT', purchaseDate: '2021-03-30', warrantyEnd: '2026-03-30', status: 'Under Repair' },
  { id: 'AST-4001', type: 'Network', model: 'Cisco Catalyst 9200 Switch', assignedTo: 'Infrastructure', department: 'IT', purchaseDate: '2024-05-09', warrantyEnd: '2029-05-09', status: 'In Use' },
  { id: 'AST-4002', type: 'Network', model: 'Ubiquiti UniFi AP 6 Pro', assignedTo: 'Floor 2', department: 'IT', purchaseDate: '2025-01-12', warrantyEnd: '2028-01-12', status: 'In Use' },
  { id: 'AST-5001', type: 'Printer', model: 'HP LaserJet Pro M404', assignedTo: 'Floor 1 Common', department: 'Admin', purchaseDate: '2022-08-14', warrantyEnd: '2025-08-14', status: 'In Use' },
  { id: 'AST-5002', type: 'Printer', model: 'Canon imageRUNNER 2630', assignedTo: '—', department: 'IT Store', purchaseDate: '2020-10-02', warrantyEnd: '2023-10-02', status: 'Retired' },
];

// ── SLA / resolution reporting (Reports & Logs tab) ───────────────────────
// `met` vs `breached` are ticket counts closed inside/outside their SLA
// window that week; avgHours is mean time-to-resolution.
export const slaWeekly = [
  { week: 'W27', met: 41, breached: 4, avgHours: 6.2 },
  { week: 'W28', met: 38, breached: 6, avgHours: 7.1 },
  { week: 'W29', met: 45, breached: 3, avgHours: 5.4 },
  { week: 'W30', met: 47, breached: 2, avgHours: 4.9 },
  { week: 'W31', met: 44, breached: 5, avgHours: 6.0 },
  { week: 'W32', met: 50, breached: 2, avgHours: 4.5 },
];

export const resolutionByCategory = [
  { category: 'Laptop / Desktop / Server', resolved: 99, avgHours: 5.8 },
  { category: 'Networking', resolved: 62, avgHours: 7.4 },
  { category: 'Software Requests', resolved: 37, avgHours: 9.1 },
  { category: 'VPN', resolved: 25, avgHours: 3.2 },
  { category: 'Data Requests', resolved: 25, avgHours: 12.6 },
];

export const engineerPerformance = [
  { engineer: 'James Wilson', resolved: 64, avgHours: 4.8, slaPct: 97 },
  { engineer: 'Meera Pillai', resolved: 52, avgHours: 5.6, slaPct: 94 },
  { engineer: 'Rahul Sen', resolved: 47, avgHours: 6.3, slaPct: 91 },
  { engineer: 'Arjun Verma', resolved: 39, avgHours: 7.0, slaPct: 88 },
];

// ── Settings (Settings tab) ───────────────────────────────────────────────
// Defaults the Settings tab initialises its form state from. Nothing here
// persists yet — there's no settings endpoint on the backend — so the tab
// says so rather than implying it saved.
export const defaultItSettings = {
  slaCriticalHours: 4,
  slaHighHours: 8,
  slaMediumHours: 24,
  slaLowHours: 48,
  autoAssignTickets: true,
  notifyOnCritical: true,
  notifyOnApproval: true,
  requireApprovalForDataTransfer: true,
  requireApprovalForSoftware: true,
  defaultTicketPriority: 'Medium',
};
