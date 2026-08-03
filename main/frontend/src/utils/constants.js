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

export const PRIORITIES = [
  { value: 'P1', label: 'P1 — High Priority', color: 'text-red-400' },
  { value: 'P2', label: 'P2 — Medium Priority', color: 'text-yellow-400' },
  { value: 'P3', label: 'P3 — Low Priority', color: 'text-green-400' },
];

export const STATUSES = ['Pending', 'In Progress', 'Completed'];
