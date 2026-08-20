import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TICKET_STATUS_COLOR } from '../data/itMockData';
import { useAuth } from './AuthContext';
import { mergeByRecent, tagDept } from '../utils/tickets';
import {
  getFounderComplaints,
  getItComplaints,
  getHrComplaints,
  getMyItComplaints,
  getMyHrComplaints,
  createItComplaint,
  createHrComplaint,
  updateItStatus,
  updateHrStatus,
  updateItFields,
  updateHrFields,
} from '../utils/api';
import { useVisibilityAwarePolling } from '../hooks/useVisibilityAwarePolling';

const TicketContext = createContext(null);

// IT/HR run this as a shared team queue (multiple people work the same
// tickets, so a new one showing up promptly matters) — Founder's merged
// view is the same idea at a glance. Everyone else only ever sees their own
// tickets, which already update instantly via optimistic local state on
// their own actions, so a background poll for *other* people's changes
// isn't buying them anything — those roles get manual refresh only.
const SHARED_QUEUE_ROLES = ['it', 'hr', 'founder'];
const SHARED_POLL_MS = 180000;

// The UI's 5-state vocabulary (a legacy 'Closed' included) vs. the backend's
// 4-state enum (backend/controllers/{hr,it}Controller.js VALID_STATUSES) —
// this map is the only place that difference has to be reconciled.
const UI_TO_BACKEND_STATUS = {
  Open: 'Pending',
  'In Progress': 'In Progress',
  'Waiting Approval': 'Waiting Approval',
  Resolved: 'Completed',
  Closed: 'Completed',
};
const BACKEND_TO_UI_STATUS = {
  Pending: 'Open',
  'In Progress': 'In Progress',
  'Waiting Approval': 'Waiting Approval',
  Completed: 'Resolved',
};

// Which extra columns each department's PATCH .../fields endpoint accepts —
// mirrors EDITABLE_FIELDS in itController.js/hrController.js. Anything not
// listed here still updates optimistically in local state but isn't sent to
// the server (e.g. vpnNo has no HR equivalent).
const EDITABLE_FIELDS = {
  it: ['employeeStatus', 'solver', 'remarks', 'vpnNo', 'employeeId'],
  hr: ['employeeStatus', 'solver', 'remarks', 'employeeId'],
};

function fromBackend(doc) {
  const status = BACKEND_TO_UI_STATUS[doc.status] || 'Open';
  const isIt = doc.dept_tag ? doc.dept_tag === 'IT' : Boolean(doc.category);
  const rawRole = doc.user_role || doc.role || doc.department || 'Employee';
  const roleDisplay = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
  return {
    id: doc.id,
    token: doc.token,
    title: doc.description || (doc.category ? `${doc.category} — ${doc.sub_category}` : 'Request'),
    user: doc.name,
    role: roleDisplay,
    dept: doc.dept_tag || (isIt ? 'IT' : 'HR'),
    category: doc.category || null,
    subcategory: doc.sub_category || null,
    status,
    statusColor: TICKET_STATUS_COLOR[status],
    employeeId: doc.employeeId || doc.employee_id || '',
    vpnNo: doc.vpnNo || '',
    date: doc.complaint_date,
    submittedAt: doc.submitted_at || null,
    updatedAt: doc.updated_at || null,
    username: (doc.name || 'you').toLowerCase().replace(/\s+/g, '.'),
    employeeStatus: doc.employeeStatus || 'Active',
    solver: doc.solver || 'Team 1',
    remarks: doc.remarks || '',
    description: doc.description,
    priority: doc.priority,
    _collection: isIt ? 'it' : 'hr',
  };
}

// Shared across the IT Service Desk's Tickets Queue and the Employee
// dashboard's "My Tickets" view — a ticket an employee raises shows up
// immediately in IT's queue, and a status change IT makes shows up
// immediately on the employee's own list, since both read the same backend
// collections (it_complaints / hr_complaints) rather than separate copies.
export function TicketProvider({ children }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  // Only the IT/HR "queue" branch below is paginated (Founder's merged view
  // and Employee's "My Tickets" stay whole-list — small/bounded lists,
  // pagination isn't worth the complexity there). nextCursor is null for
  // those roles, so loadMoreTickets is a no-op for them.
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isSharedQueue = Boolean(user) && SHARED_QUEUE_ROLES.includes(user.role);

  const refresh = useCallback(async () => {
    if (!user) {
      setTickets([]);
      setNextCursor(null);
      return;
    }
    setLoading(true);
    try {
      let rows;
      let cursor = null;
      // Defensive `|| []`/`?.` throughout: a response caught mid-deploy
      // (stale serverless instance, proxy hiccup) can come back without the
      // expected shape — fall back to empty rather than crash the page.
      if (user.role === 'founder') {
        rows = (await getFounderComplaints()).data || [];
      } else if (user.role === 'it') {
        const { items, nextCursor: nc } = (await getItComplaints()).data || {};
        rows = tagDept(items || [], 'IT');
        cursor = nc || null;
      } else if (user.role === 'hr') {
        const { items, nextCursor: nc } = (await getHrComplaints()).data || {};
        rows = tagDept(items || [], 'HR');
        cursor = nc || null;
      } else {
        const [it, hr] = await Promise.all([getMyItComplaints(), getMyHrComplaints()]);
        rows = mergeByRecent(tagDept(it.data || [], 'IT'), tagDept(hr.data || [], 'HR'));
      }
      setTickets(rows.map(fromBackend));
      setNextCursor(cursor);
      setLastUpdated(new Date().toISOString());
    } catch (e) {
      console.error('Failed to load tickets:', e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Appends the next 20 to the existing list — resets back to page 1 on the
  // next poll/refresh, same as any other "Load More" list.
  async function loadMoreTickets() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const isIt = user.role === 'it';
      const { items, nextCursor: nc } = (isIt
        ? (await getItComplaints(nextCursor)).data
        : (await getHrComplaints(nextCursor)).data) || {};
      const tagged = tagDept(items || [], isIt ? 'IT' : 'HR');
      setTickets((prev) => [...prev, ...tagged.map(fromBackend)]);
      setNextCursor(nc);
    } catch (e) {
      console.error('Failed to load more tickets:', e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Only the shared-queue roles auto-poll (and re-check on regaining tab
  // focus) — "My Tickets" roles fetch once on mount/login and otherwise only
  // refresh when the user asks (manual refresh button) or when their own
  // action updates local state optimistically.
  useVisibilityAwarePolling(refresh, SHARED_POLL_MS, isSharedQueue);

  // Rethrows on failure (rather than only console.error-ing) so callers can
  // tell a request actually failed instead of showing a "success" screen
  // and discarding the user's input regardless of what really happened.
  async function addTicket(req, requesterName) {
    const isHr = req.dept === 'HR';
    const name = requesterName || user?.full_name || 'You';
    const description = req.title && req.description ? `${req.title}: ${req.description}` : (req.description || req.title || '');
    const empId = req.employeeId || user?.employeeId || user?.employee_id || '';
    const formattedUserRole = user?.department || user?.designation || (user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Employee');
    const ticketRole = req.role || formattedUserRole;

    try {
      if (isHr) {
        const { data } = await createHrComplaint({
          name,
          role: ticketRole,
          department: req.department || user?.department || ticketRole,
          description,
          complaint_date: new Date().toISOString().slice(0, 10),
          priority: req.priority || 'Medium',
          employeeId: empId,
        });
        setTickets((prev) => [fromBackend({ ...data.complaint, dept_tag: 'HR' }), ...prev]);
      } else {
        const { data } = await createItComplaint({
          name,
          role: ticketRole,
          department: req.department || user?.department || ticketRole,
          category: req.category || 'Laptop / Desktop / Server',
          sub_category: req.subcategory || req.sub_category || 'Other Hardware/Software Issues',
          description,
          complaint_date: new Date().toISOString().slice(0, 10),
          priority: req.priority || 'Medium',
          employeeId: empId,
          vpnNo: req.vpnNo,
        });
        setTickets((prev) => [fromBackend({ ...data.complaint, dept_tag: 'IT' }), ...prev]);
      }
    } catch (e) {
      console.error('Failed to create ticket:', e.response?.data?.error || e.message);
      throw e;
    }
  }

  async function changeStatus(id, uiStatus) {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;
    const backendStatus = UI_TO_BACKEND_STATUS[uiStatus] || uiStatus;

    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: uiStatus, statusColor: TICKET_STATUS_COLOR[uiStatus] } : t))
    );

    try {
      const updateFn = ticket._collection === 'hr' ? updateHrStatus : updateItStatus;
      const { data } = await updateFn(id, backendStatus);
      setTickets((prev) => prev.map((t) => (t.id === id ? fromBackend({ ...data, dept_tag: ticket.dept }) : t)));
    } catch (e) {
      console.error('Failed to update ticket status:', e.response?.data?.error || e.message);
      refresh();
    }
  }

  async function updateTicketField(id, field, value) {
    if (field === 'status') return changeStatus(id, value);

    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;

    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));

    const allowed = EDITABLE_FIELDS[ticket._collection] || [];
    if (!allowed.includes(field)) return;

    try {
      const updateFn = ticket._collection === 'hr' ? updateHrFields : updateItFields;
      await updateFn(id, { [field]: value });
    } catch (e) {
      console.error('Failed to update ticket field:', e.response?.data?.error || e.message);
      refresh();
    }
  }

  return (
    <TicketContext.Provider value={{ tickets, loading, addTicket, changeStatus, updateTicketField, refresh, hasMoreTickets: Boolean(nextCursor), loadMoreTickets, loadingMore, lastUpdated, isSharedQueue }}>
      {children}
    </TicketContext.Provider>
  );
}

export function useTickets() {
  return useContext(TicketContext);
}
