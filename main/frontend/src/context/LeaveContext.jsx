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

// Shared with the Founder's Pending Leaves Approval view — HR no longer has
// its own leave-approval page, so the Founder is currently the only place
// any leave request (from any department) gets decided.
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
