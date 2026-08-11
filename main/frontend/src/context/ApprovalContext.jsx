import { createContext, useContext, useState } from 'react';

const ApprovalContext = createContext(null);

// `createdAt` is a real timestamp backing "sort by date" in the Approval
// Center — `timestamp` alone ("2 hours ago") can't be sorted chronologically
// once it stops updating, since it's a rendered-once string, not a live
// clock. Offsets below just make the three seed rows agree with what their
// display strings already say.
const NOW = Date.now();

const SEED = [
  {
    id: 1,
    source: 'IT',
    title: 'Software Installation',
    sub: 'Visual Studio Code - 4 developer seats',
    requestedBy: 'Arjun Verma',
    timestamp: '2 hours ago',
    createdAt: NOW - 2 * 60 * 60 * 1000,
    priority: 'medium',
    category: 'Software',
    status: 'pending_founder',
  },
  {
    id: 2,
    source: 'IT',
    title: 'System Access Request',
    sub: 'Production server access for on-call rotation',
    requestedBy: 'Sneha Iyer',
    timestamp: '4 hours ago',
    createdAt: NOW - 4 * 60 * 60 * 1000,
    priority: 'high',
    category: 'System Access',
    status: 'pending_founder',
  },
  {
    id: 3,
    source: 'IT',
    title: 'Hardware Procurement',
    sub: '3x replacement laptops for the design team',
    requestedBy: 'Devansh Gupta',
    timestamp: '1 day ago',
    createdAt: NOW - 24 * 60 * 60 * 1000,
    priority: 'low',
    category: 'Hardware',
    status: 'approved',
  },
  {
    id: 4,
    source: 'IT',
    title: 'VPN Access Request',
    sub: 'Remote VPN access for new contractor onboarding',
    requestedBy: 'Riya Malhotra',
    timestamp: '6 hours ago',
    createdAt: NOW - 6 * 60 * 60 * 1000,
    priority: 'medium',
    category: 'System Access',
    status: 'pending_founder',
  },
  {
    id: 5,
    source: 'IT',
    title: 'Cloud Storage Upgrade',
    sub: 'Upgrade project drive from 2TB to 5TB plan',
    requestedBy: 'Karan Mehta',
    timestamp: '3 days ago',
    createdAt: NOW - 3 * 24 * 60 * 60 * 1000,
    priority: 'low',
    category: 'Software',
    status: 'approved',
  },
  {
    id: 6,
    source: 'IT',
    title: 'Firewall Rule Change',
    sub: 'Open port 8443 for new render farm node',
    requestedBy: 'Neha Kapoor',
    timestamp: '2 days ago',
    createdAt: NOW - 2 * 24 * 60 * 60 * 1000,
    priority: 'high',
    category: 'System Access',
    status: 'rejected',
  },
  {
    id: 7,
    source: 'IT',
    title: 'Software License Renewal',
    sub: 'Adobe Creative Cloud - 10 seats renewal',
    requestedBy: 'Aditya Rao',
    timestamp: '30 min ago',
    createdAt: NOW - 30 * 60 * 1000,
    priority: 'medium',
    category: 'Software',
    status: 'pending_founder',
  },
];

// Shared across IT's Approval Center, the Founder's Approval System, and
// HR's read-only approvals feed — IT proposes (submitApproval), the Founder
// decides (decide), and once approved it's visible to HR too. All three
// read/write the same state instead of separate local copies (mirrors
// LeaveContext's pattern).
export function ApprovalProvider({ children }) {
  const [approvals, setApprovals] = useState(SEED);

  function submitApproval(item) {
    setApprovals((prev) => [
      {
        id: Date.now(),
        source: 'IT',
        timestamp: 'Just now',
        createdAt: Date.now(),
        priority: 'medium',
        category: 'General',
        status: 'pending_founder',
        ...item,
      },
      ...prev,
    ]);
  }

  function decide(id, status) {
    setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  return (
    <ApprovalContext.Provider value={{ approvals, submitApproval, decide }}>
      {children}
    </ApprovalContext.Provider>
  );
}

export function useApprovals() {
  return useContext(ApprovalContext);
}
