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
