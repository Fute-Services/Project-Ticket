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
