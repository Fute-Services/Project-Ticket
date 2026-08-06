import { createContext, useContext, useState } from 'react';
import { leaveRequests as SEED, employees } from '../data/hrMockData';

const LeaveContext = createContext(null);

// HR's job is staff management, not approving its own department's time
// off — so a leave request from someone in HR or IT routes to the
// Founder for approval instead of showing up in HR's own approve/reject
// queue. Everyone else's leave still goes through HR as normal.
export function isFounderApproval(request) {
  const employee = employees.find((e) => e.id === request.employeeId);
  return employee?.department === 'Human Resources' || employee?.department === 'IT';
}

// Shared across HR's Leave page and the Founder's Leave Approvals tab so a
// decision made in either place is immediately reflected in the other —
// both pages read/write the same state instead of separate local copies.
export function LeaveProvider({ children }) {
  const [leaveRequests, setLeaveRequests] = useState(SEED);

  function decide(id, status) {
    setLeaveRequests((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  function applyLeave(request) {
    setLeaveRequests((rows) => [request, ...rows]);
  }

  return (
    <LeaveContext.Provider value={{ leaveRequests, decide, applyLeave }}>
      {children}
    </LeaveContext.Provider>
  );
}

export function useLeave() {
  return useContext(LeaveContext);
}
