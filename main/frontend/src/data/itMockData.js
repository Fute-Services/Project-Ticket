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

// ── Tickets (shared between the IT Service Desk queue and the Employee
// "My Tickets" view — both read/write the same list via TicketContext) ────
export const TICKET_STATUS_COLOR = {
  Open: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'In Progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Waiting Approval': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Closed: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export const initialTickets = [
  {
    id: 1,
    token: 'INC-1024',
    title: 'Laptop hanging and slow performance',
    user: 'John Doe',
    dept: 'IT Support',
    status: 'In Progress',
    statusColor: TICKET_STATUS_COLOR['In Progress'],
    employeeId: 'EMP-2001',
    vpnNo: 'VPN-1082',
    date: '2026-08-09',
    username: 'john.doe',
    employeeStatus: 'Active',
    solver: 'Team 1',
    remarks: '',
  },
  {
    id: 2,
    token: 'INC-1023',
    title: 'Internet connection keeps dropping',
    user: 'Jane Smith',
    dept: 'Network',
    status: 'Open',
    statusColor: TICKET_STATUS_COLOR.Open,
    employeeId: 'EMP-2002',
    vpnNo: 'VPN-1095',
    date: '2026-08-09',
    username: 'jane.smith',
    employeeStatus: 'Pending',
    solver: 'Team 2',
    remarks: '',
  },
  {
    id: 3,
    token: 'REQ-1018',
    title: 'Request for Adobe Photoshop installation',
    user: 'Mike Johnson',
    dept: 'Software',
    status: 'Waiting Approval',
    statusColor: TICKET_STATUS_COLOR['Waiting Approval'],
    employeeId: 'EMP-2003',
    vpnNo: 'VPN-2018',
    date: '2026-08-08',
    username: 'mike.johnson',
    employeeStatus: 'Pending',
    solver: 'Team 3',
    remarks: '',
  },
  {
    id: 4,
    token: 'VPN-1012',
    title: 'VPN access not working',
    user: 'Sarah Wilson',
    dept: 'VPN',
    status: 'In Progress',
    statusColor: TICKET_STATUS_COLOR['In Progress'],
    employeeId: 'EMP-2004',
    vpnNo: 'VPN-2044',
    date: '2026-08-08',
    username: 'sarah.wilson',
    employeeStatus: 'Active',
    solver: 'Team 1',
    remarks: '',
  },
  {
    id: 5,
    token: 'DR-1009',
    title: 'Data transfer from Server 70 to 131',
    user: 'Robert Brown',
    dept: 'Data Team',
    status: 'Open',
    statusColor: TICKET_STATUS_COLOR.Open,
    employeeId: 'EMP-2005',
    vpnNo: 'VPN-3051',
    date: '2026-08-07',
    username: 'robert.brown',
    employeeStatus: 'Active',
    solver: 'Team 4',
    remarks: '',
  },
];

// ── Asset inventory (Asset Management tab) ────────────────────────────────
export const ASSET_TYPES = ['Laptop', 'Desktop', 'Server', 'Network', 'Printer'];
export const ASSET_STATUSES = ['In Use', 'Available', 'Under Repair', 'Retired'];

export const assets = [
  {
    id: 'AST-1001', type: 'Laptop', model: 'Dell Latitude 5440', assignedTo: 'John Doe', department: 'Engineering', purchaseDate: '2024-02-11', warrantyEnd: '2027-02-11', status: 'In Use', approvalStatus: 'approved',
    hardDisk: '512GB NVMe SSD',
    componentsList: ['16GB RAM', 'Intel Core i7-1355U', 'Integrated Iris Xe Graphics'],
    componentsLog: [{ date: '2025-03-02', change: 'Upgraded RAM from 8GB to 16GB' }],
    history: [{ date: '2024-02-14', event: 'Assigned to John Doe' }],
  },
  {
    id: 'AST-1002', type: 'Laptop', model: 'MacBook Pro 14"', assignedTo: 'Priya Nair', department: 'Design', purchaseDate: '2025-06-03', warrantyEnd: '2028-06-03', status: 'In Use', approvalStatus: 'pending_founder',
    hardDisk: '1TB NVMe SSD',
    componentsList: ['16GB Unified Memory', 'Apple M3 Pro', '18-core GPU'],
    componentsLog: [],
    history: [{ date: '2025-06-05', event: 'Assigned to Priya Nair' }],
  },
  {
    id: 'AST-1003', type: 'Laptop', model: 'Lenovo ThinkPad T14', assignedTo: '—', department: 'IT Store', purchaseDate: '2023-09-20', warrantyEnd: '2026-09-20', status: 'Available', approvalStatus: 'not_approved',
    hardDisk: '256GB SSD',
    componentsList: ['8GB RAM', 'Intel Core i5-1235U', 'Integrated UHD Graphics'],
    componentsLog: [],
    history: [
      { date: '2023-09-22', event: 'Assigned to Kabir Malhotra' },
      { date: '2025-11-30', event: 'Returned to IT Store — role change' },
    ],
  },
  {
    id: 'AST-2001', type: 'Desktop', model: 'HP EliteDesk 800', assignedTo: 'Jane Smith', department: 'Finance', purchaseDate: '2023-04-18', warrantyEnd: '2026-04-18', status: 'In Use', approvalStatus: 'none',
    hardDisk: '512GB SSD',
    componentsList: ['16GB RAM', 'Intel Core i7-13700', 'Intel UHD Graphics 770'],
    componentsLog: [],
    history: [{ date: '2023-04-20', event: 'Assigned to Jane Smith' }],
  },
  {
    id: 'AST-2002', type: 'Desktop', model: 'Dell OptiPlex 7010', assignedTo: '—', department: 'IT Store', purchaseDate: '2022-11-05', warrantyEnd: '2025-11-05', status: 'Under Repair', approvalStatus: 'none',
    hardDisk: '1TB HDD',
    componentsList: ['8GB RAM', 'Intel Core i5-13500', 'Intel UHD Graphics 770'],
    componentsLog: [{ date: '2026-07-28', change: 'PSU flagged as failing during diagnostics' }],
    history: [
      { date: '2022-11-08', event: 'Assigned to Rohit Malhotra' },
      { date: '2026-07-28', event: 'Sent for repair — power supply fault' },
    ],
  },
  {
    id: 'AST-3001', type: 'Server', model: 'Dell PowerEdge R750 (Server 70)', assignedTo: 'Infrastructure', department: 'IT', purchaseDate: '2023-01-15', warrantyEnd: '2028-01-15', status: 'In Use', approvalStatus: 'approved',
    hardDisk: '4x 3.84TB NVMe SSD (RAID 10)',
    componentsList: ['256GB RAM', '2x Intel Xeon Gold 6338', 'Dual redundant PSU'],
    componentsLog: [{ date: '2026-02-10', change: 'RAM expanded from 128GB to 256GB' }],
    history: [{ date: '2023-01-20', event: 'Commissioned into production rack' }],
  },
  {
    id: 'AST-3002', type: 'Server', model: 'HPE ProLiant DL380 (Server 131)', assignedTo: 'Infrastructure', department: 'IT', purchaseDate: '2024-07-22', warrantyEnd: '2029-07-22', status: 'In Use',
    hardDisk: '2x 7.68TB NVMe SSD (RAID 1)',
    componentsList: ['128GB RAM', '2x Intel Xeon Silver 4410Y', 'Dual redundant PSU'],
    componentsLog: [],
    history: [{ date: '2024-07-25', event: 'Commissioned into production rack' }],
  },
  {
    id: 'AST-3003', type: 'Server', model: 'Dell PowerEdge R640 (Server 29)', assignedTo: 'Infrastructure', department: 'IT', purchaseDate: '2021-03-30', warrantyEnd: '2026-03-30', status: 'Under Repair',
    hardDisk: '2x 1.92TB SSD (RAID 1)',
    componentsList: ['64GB RAM', '2x Intel Xeon Silver 4210'],
    componentsLog: [{ date: '2026-08-01', change: 'Disk 2 reporting SMART pre-fail warnings' }],
    history: [{ date: '2026-08-01', event: 'Pulled from rotation for disk replacement' }],
  },
  {
    id: 'AST-4001', type: 'Network', model: 'Cisco Catalyst 9200 Switch', assignedTo: 'Infrastructure', department: 'IT', purchaseDate: '2024-05-09', warrantyEnd: '2029-05-09', status: 'In Use',
    hardDisk: '—',
    componentsList: ['48-port PoE+', '4x 10G SFP+ uplinks'],
    componentsLog: [],
    history: [{ date: '2024-05-12', event: 'Installed in main server room rack' }],
  },
  {
    id: 'AST-4002', type: 'Network', model: 'Ubiquiti UniFi AP 6 Pro', assignedTo: 'Floor 2', department: 'IT', purchaseDate: '2025-01-12', warrantyEnd: '2028-01-12', status: 'In Use',
    hardDisk: '—',
    componentsList: ['Wi-Fi 6', '2.5GbE uplink'],
    componentsLog: [],
    history: [{ date: '2025-01-14', event: 'Mounted — Floor 2 east wing' }],
  },
  {
    id: 'AST-5001', type: 'Printer', model: 'HP LaserJet Pro M404', assignedTo: 'Floor 1 Common', department: 'Admin', purchaseDate: '2022-08-14', warrantyEnd: '2025-08-14', status: 'In Use',
    hardDisk: '—',
    componentsList: ['Standard 250-sheet tray'],
    componentsLog: [{ date: '2026-06-01', change: 'Fuser unit replaced' }],
    history: [{ date: '2022-08-16', event: 'Installed — Floor 1 common area' }],
  },
  {
    id: 'AST-5002', type: 'Printer', model: 'Canon imageRUNNER 2630', assignedTo: '—', department: 'IT Store', purchaseDate: '2020-10-02', warrantyEnd: '2023-10-02', status: 'Retired',
    hardDisk: '—',
    componentsList: [],
    componentsLog: [],
    history: [
      { date: '2020-10-05', event: 'Installed — Floor 1 common area' },
      { date: '2025-09-01', event: 'Retired — replaced by AST-5001' },
    ],
  },
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
