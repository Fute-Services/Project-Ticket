// IT category → sub-category map
export const IT_CATEGORIES = {
  Software: ['Asana Issue', 'Mail Issue', 'Login Issue', 'Software Installation', 'License Issue'],
  'Laptop/Device': ['Keyboard', 'Mouse', 'Charger', 'Screen Issue', 'Battery Issue'],
  Desktop: ['Power Cut Issue', 'Monitor', 'CPU Issue', 'Restart Loop'],
  Storage: ['Drive Full', 'Backup Issue', 'External Drive', 'Data Recovery'],
  VPN: ['VPN Not Connecting', 'Slow VPN', 'Access Denied'],
  Networking: ['No Internet', 'Slow Internet', 'WiFi Issue', 'LAN Issue'],
  Rendering: ['Render Crash', 'Slow Render', 'GPU Issue', 'Driver Issue'],
};

export const DEPARTMENTS = [
  'Development', 'Design', 'Architecture', 'Sales',
  'Marketing', 'Operations', 'HR', 'IT',
];

/**
 * Priority levels. The stored value stays P1/P2/P3, but nobody should have to
 * guess what those mean — every screen shows the plain-language name and the
 * response time we promise for it.
 */
export const PRIORITIES = [
  {
    value: 'P1',
    name: 'High',
    dot: '🔴',
    label: 'P1 — High Priority',
    summary: 'Critical issue, work is blocked',
    sla: 'Response within 2 hours',
    color: 'text-red-400',
    badge: 'bg-red-500/15 text-red-400 border-red-500/20',
    ring: 'border-red-500/60 bg-red-500/10',
  },
  {
    value: 'P2',
    name: 'Medium',
    dot: '🟡',
    label: 'P2 — Medium Priority',
    summary: 'Normal issue, work can continue',
    sla: 'Response within 24 hours',
    color: 'text-yellow-400',
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    ring: 'border-yellow-500/60 bg-yellow-500/10',
  },
  {
    value: 'P3',
    name: 'Low',
    dot: '🟢',
    label: 'P3 — Low Priority',
    summary: 'Minor request, no rush',
    sla: 'Response within 3 days',
    color: 'text-green-400',
    badge: 'bg-green-500/15 text-green-400 border-green-500/20',
    ring: 'border-green-500/60 bg-green-500/10',
  },
];

export const PRIORITY_BY_VALUE = Object.fromEntries(PRIORITIES.map(p => [p.value, p]));

export const STATUSES = ['Pending', 'In Progress', 'Completed'];

export const STATUS_META = {
  'Pending':     { dot: '🟡', badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  'In Progress': { dot: '🔵', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  'Completed':   { dot: '🟢', badge: 'bg-green-500/15 text-green-400 border-green-500/20' },
};

// How many complaints a list page requests at a time
export const PAGE_SIZE = 20;
