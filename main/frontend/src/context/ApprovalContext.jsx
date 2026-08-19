import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { relativeTime } from '../utils/tickets';
import { getApprovals, submitApprovalRequest, decideApproval } from '../utils/api';
import { useVisibilityAwarePolling } from '../hooks/useVisibilityAwarePolling';

const ApprovalContext = createContext(null);

// Approvals refresh on this interval so a ticket another user (IT/HR desk)
// just sent to "Waiting Approval" shows up here without a manual reload —
// TicketContext and ApprovalContext are siblings, not nested, so there's no
// direct call path between them; the backend is the shared source of truth.
const POLL_MS = 20000;

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
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !['it', 'hr', 'founder'].includes(user.role)) {
      setApprovals([]);
      setNextCursor(null);
      return;
    }
    setLoading(true);
    try {
      const { data } = await getApprovals();
      setApprovals(data.items.map(fromBackend));
      setNextCursor(data.nextCursor);
    } catch (e) {
      console.error('Failed to load approvals:', e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Appends the next 20 — resets back to page 1 on the next poll/refresh.
  async function loadMoreApprovals() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data } = await getApprovals(nextCursor);
      setApprovals((prev) => [...prev, ...data.items.map(fromBackend)]);
      setNextCursor(data.nextCursor);
    } catch (e) {
      console.error('Failed to load more approvals:', e.response?.data?.error || e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [refresh]);

  useVisibilityAwarePolling(refresh, POLL_MS, Boolean(user));

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
    <ApprovalContext.Provider value={{ approvals, loading, submitApproval, decide, refresh, hasMoreApprovals: Boolean(nextCursor), loadMoreApprovals, loadingMore }}>
      {children}
    </ApprovalContext.Provider>
  );
}

export function useApprovals() {
  return useContext(ApprovalContext);
}
