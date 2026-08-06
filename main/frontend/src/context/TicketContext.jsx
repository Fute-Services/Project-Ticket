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
    setTickets((prev) => [
      {
        id: Date.now(),
        token: `REQ-${1025 + prev.length}`,
        title: req.description,
        user: requesterName || 'You',
        dept: req.department || req.category,
        status: 'Open',
        statusColor: TICKET_STATUS_COLOR.Open,
      },
      ...prev,
    ]);
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
