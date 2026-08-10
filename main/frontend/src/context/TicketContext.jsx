import { createContext, useContext, useState } from 'react';
import { initialTickets, TICKET_STATUS_COLOR } from '../data/itMockData';

const TicketContext = createContext(null);

// Shared across the IT Service Desk's Tickets Queue and the Employee
// dashboard's "My Tickets" view — a ticket an employee raises shows up
// immediately in IT's queue, and a status change IT makes shows up
// immediately on the employee's own list, since both read/write the same
// state instead of separate local copies (mirrors LeaveContext's pattern).
export function TicketProvider({ children }) {
  const [tickets, setTickets] = useState(initialTickets);

  function addTicket(req, requesterName) {
    setTickets((prev) => {
      const seq = prev.length;
      return [
        {
          id: Date.now(),
          token: `REQ-${1025 + seq}`,
          title: req.description,
          user: requesterName || 'You',
          dept: req.department || req.category,
          status: 'Open',
          statusColor: TICKET_STATUS_COLOR.Open,
          // Administrative metadata the IT desk tracks per ticket. Callers
          // don't collect these on the raise-ticket form, so they're
          // derived here — same sequential-ID convention as the token
          // itself — rather than left blank on every new ticket.
          employeeId: req.employeeId || `EMP-${3000 + seq}`,
          vpnNo: req.vpnNo || '—',
          date: req.date || new Date().toISOString().slice(0, 10),
          username: req.username || (requesterName || 'you').toLowerCase().replace(/\s+/g, '.'),
        },
        ...prev,
      ];
    });
  }

  function changeStatus(id, status) {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status, statusColor: TICKET_STATUS_COLOR[status] } : t))
    );
  }

  return (
    <TicketContext.Provider value={{ tickets, addTicket, changeStatus }}>
      {children}
    </TicketContext.Provider>
  );
}

export function useTickets() {
  return useContext(TicketContext);
}
