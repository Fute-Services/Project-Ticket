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

const TicketContext = createContext(null);

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
  return {
    id: doc.id,
    token: doc.token,
    title: doc.category ? `${doc.category} — ${doc.sub_category}` : (doc.description || 'Request').slice(0, 60),
    user: doc.name,
    dept: doc.dept_tag || (isIt ? 'IT' : 'HR'),
    category: doc.category || null,
    status,
    statusColor: TICKET_STATUS_COLOR[status],
    employeeId: doc.employeeId || '',
    vpnNo: doc.vpnNo || '',
    date: doc.complaint_date,
    submittedAt: doc.submitted_at || null,
    updatedAt: doc.updated_at || null,
    username: (doc.name || 'you').toLowerCase().replace(/\s+/g, '.'),
    employeeStatus: doc.employeeStatus || '',
    solver: doc.solver || '',
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

  const refresh = useCallback(async () => {
    if (!user) {
      setTickets([]);
      return;
    }
    setLoading(true);
    try {
      let rows;
      if (user.role === 'founder') {
        rows = (await getFounderComplaints()).data;
      } else if (user.role === 'it') {
        rows = tagDept((await getItComplaints()).data, 'IT');
      } else if (user.role === 'hr') {
        rows = tagDept((await getHrComplaints()).data, 'HR');
      } else {
        const [it, hr] = await Promise.all([getMyItComplaints(), getMyHrComplaints()]);
        rows = mergeByRecent(tagDept(it.data, 'IT'), tagDept(hr.data, 'HR'));
      }
      setTickets(rows.map(fromBackend));
    } catch (e) {
      console.error('Failed to load tickets:', e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [refresh, user]);

  async function addTicket(req, requesterName) {
    const isHr = req.dept === 'HR';
    const name = requesterName || user?.full_name || 'You';
    const description = req.title && req.description ? `${req.title}: ${req.description}` : (req.description || req.title || '');

    try {
      if (isHr) {
        const { data } = await createHrComplaint({
          name,
          department: req.department || user?.department || 'General',
          description,
          complaint_date: new Date().toISOString().slice(0, 10),
          priority: req.priority || 'Medium',
          employeeId: req.employeeId,
        });
        setTickets((prev) => [fromBackend({ ...data.complaint, dept_tag: 'HR' }), ...prev]);
      } else {
        const { data } = await createItComplaint({
          name,
          department: req.department || user?.department || 'General',
          category: req.category || 'Laptop / Desktop / Server',
          sub_category: req.subcategory || req.sub_category || 'Other Hardware/Software Issues',
          description,
          complaint_date: new Date().toISOString().slice(0, 10),
          priority: req.priority || 'Medium',
          employeeId: req.employeeId,
          vpnNo: req.vpnNo,
        });
        setTickets((prev) => [fromBackend({ ...data.complaint, dept_tag: 'IT' }), ...prev]);
      }
    } catch (e) {
      console.error('Failed to create ticket:', e.response?.data?.error || e.message);
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
    <TicketContext.Provider value={{ tickets, loading, addTicket, changeStatus, updateTicketField, refresh }}>
      {children}
    </TicketContext.Provider>
  );
}

export function useTickets() {
  return useContext(TicketContext);
}
