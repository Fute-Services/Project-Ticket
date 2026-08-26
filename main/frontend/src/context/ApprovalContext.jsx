import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { relativeTime } from '../utils/tickets';
import { getApprovals, submitApprovalRequest, decideApproval } from '../utils/api';
import { useVisibilityAwarePolling } from '../hooks/useVisibilityAwarePolling';
import { useCursorPagination } from '../hooks/useCursorPagination';

const ApprovalContext = createContext(null);

// Approvals refresh on this interval so a ticket another user (IT/HR desk)
// just sent to "Waiting Approval" shows up here without a manual reload —
// TicketContext and ApprovalContext are siblings, not nested, so there's no
// direct call path between them; the backend is the shared source of truth.
// Own decides/submits already update local state optimistically below, so
// this only needs to be tight enough for cross-session updates, not instant.
// Kept relatively tight (vs. Assets/Renders' 5min) since a pending approval
// sitting unseen has a direct SLA/business cost.
const POLL_MS = 180000;

function fromBackend(doc) {
  return { ...doc, timestamp: relativeTime(doc.createdAt) };
}

// Shared across IT's Approval Center, the Founder's Approval System, and
// HR's read-only approvals feed — IT/HR propose (submitApproval), the
// Founder decides (decide). Tickets whose status is set to "Waiting
// Approval" also land here automatically (backend/controllers/{hr,it}Controller.js
// creates the record), so this isn't the only way an approval appears.
export function ApprovalProvider({ children }) {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { hasMore, loadingMore, setCursor, loadMore } = useCursorPagination();

  const refresh = useCallback(async () => {
    if (!user || !['it', 'hr', 'founder'].includes(user.role)) {
      setApprovals([]);
      setCursor(null);
      return;
    }
    setLoading(true);
    try {
      const { data } = await getApprovals();
      // Defensive: a response caught mid-deploy can come back without the
      // expected shape — fall back to empty rather than crash the page.
      setApprovals((data?.items || []).map(fromBackend));
      setCursor(data?.nextCursor || null);
      setLastUpdated(new Date().toISOString());
    } catch (e) {
      console.error('Failed to load approvals:', e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on
    // id/role (stable primitives), not the `user` object itself, which
    // AuthContext replaces with a new reference on every login-state
    // refresh even when the actual user hasn't changed — depending on the
    // object caused this refresh to needlessly refire and duplicate reads.
  }, [user?.id, user?.role, setCursor]);

  // Appends the next 20 — resets back to page 1 on the next poll/refresh.
  function loadMoreApprovals() {
    return loadMore(getApprovals, (items) => setApprovals((prev) => [...prev, ...items.map(fromBackend)]));
  }

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Gated to the same roles as refresh() itself — otherwise an
  // employee/coordinator session (which always gets an empty list here)
  // would still poll every interval for nothing.
  useVisibilityAwarePolling(refresh, POLL_MS, Boolean(user) && ['it', 'hr', 'founder'].includes(user.role));

  async function submitApproval(item) {
    try {
      const { data } = await submitApprovalRequest(item);
      setApprovals((prev) => [fromBackend(data), ...prev]);
    } catch (e) {
      console.error('Failed to submit approval request:', e.response?.data?.error || e.message);
      throw e;
    }
  }

  async function decide(id, status) {
    setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      const { data } = await decideApproval(id, status);
      setApprovals((prev) => prev.map((a) => (a.id === id ? fromBackend(data) : a)));
    } catch (e) {
      console.error('Failed to decide approval:', e.response?.data?.error || e.message);
      refresh();
    }
  }

  return (
    <ApprovalContext.Provider value={{ approvals, loading, submitApproval, decide, refresh, hasMoreApprovals: hasMore, loadMoreApprovals, loadingMore, lastUpdated }}>
      {children}
    </ApprovalContext.Provider>
  );
}

export function useApprovals() {
  return useContext(ApprovalContext);
}
