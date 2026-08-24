import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { applyLeave as applyLeaveApi, getAllLeaves, getMyLeaves, decideLeave } from '../utils/api';
import { useVisibilityAwarePolling } from '../hooks/useVisibilityAwarePolling';

const LeaveContext = createContext(null);

// HR's job is staff management, not approving its own department's time
// off — so a leave request from someone in Admin/Ops or IT routes to the
// Founder for approval instead of showing up in HR's own approve/reject
// queue. Enforced server-side too (backend/controllers/leaveController.js).
export function isFounderApproval(request) {
  return request?.department === 'Admin/Ops' || request?.department === 'IT';
}

// HR/Founder see the shared "decide on everyone's leave" queue — worth
// polling since a pending request sitting unseen delays someone's time off.
// Everyone else only ever sees their own leave history, which already
// updates instantly via optimistic local state on applyLeave — no
// background poll needed there, manual refresh only.
const SHARED_QUEUE_ROLES = ['hr', 'founder'];
const SHARED_POLL_MS = 300000;

// Shared with the Founder's Pending Leaves Approval view — HR no longer has
// its own leave-approval page, so the Founder is currently the only place
// any leave request (from any department) gets decided.
export function LeaveProvider({ children }) {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isSharedQueue = Boolean(user) && SHARED_QUEUE_ROLES.includes(user.role);

  const refresh = useCallback(async () => {
    if (!user) {
      setLeaveRequests([]);
      return;
    }
    setLoading(true);
    try {
      const canSeeAll = user.role === 'hr' || user.role === 'founder';
      const { data } = canSeeAll ? await getAllLeaves() : await getMyLeaves();
      setLeaveRequests(data);
      setLastUpdated(new Date().toISOString());
    } catch (e) {
      console.error('Failed to load leave requests:', e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useVisibilityAwarePolling(refresh, SHARED_POLL_MS, isSharedQueue);

  async function decide(id, status) {
    setLeaveRequests((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      const { data } = await decideLeave(id, status);
      setLeaveRequests((rows) => rows.map((r) => (r.id === id ? data : r)));
    } catch (e) {
      console.error('Failed to decide leave request:', e.response?.data?.error || e.message);
      refresh();
    }
  }

  async function applyLeave(request) {
    try {
      const { data } = await applyLeaveApi(request);
      setLeaveRequests((rows) => [data, ...rows]);
    } catch (e) {
      console.error('Failed to apply for leave:', e.response?.data?.error || e.message);
      // Rethrow (matching addTicket/submitApproval's convention) so a caller
      // awaiting this can show its own failure state instead of a false
      // success — swallowing it here made the caller's .then() run either way.
      throw e;
    }
  }

  return (
    <LeaveContext.Provider value={{ leaveRequests, loading, decide, applyLeave, refresh, lastUpdated, isSharedQueue }}>
      {children}
    </LeaveContext.Provider>
  );
}

export function useLeave() {
  return useContext(LeaveContext);
}
