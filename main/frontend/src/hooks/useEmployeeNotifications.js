import { useEffect, useMemo, useState } from 'react';
import { useTickets } from '../context/TicketContext';
import { relativeTime } from '../utils/tickets';
import { extraHoursApi } from '../utils/api';

// Same real-events philosophy as useHrNotifications/useItNotifications, but
// for the employee — useTickets() already scopes to just their own IT+HR
// tickets (see TicketContext.jsx's role === 'employee' branch), so the one
// meaningful signal here is "your own ticket's status just changed,"
// surfaced to the person who raised it rather than the team working it.
export function useEmployeeNotifications() {
  const { tickets } = useTickets();
  const [mentions, setMentions] = useState([]);

  // Someone else's "Log Extra Hours" submission named this employee under
  // "Any other teammates along with me" (free-text, matched by name server
  // side — see myExtraHoursMentions in hrDeskController.js). Routes to the
  // tasks tab, where the Extra Hours card (EmployeeDashboardPage.jsx) shows
  // it alongside every other entry involving this employee.
  useEffect(() => {
    extraHoursApi.myMentions()
      .then(({ data }) => setMentions(data || []))
      .catch(() => setMentions([]));
  }, []);

  return useMemo(() => {
    const ticketNotifs = tickets
      .filter((t) => ['Resolved', 'In Progress', 'Waiting Approval'].includes(t.status))
      .map((t) => ({
        id: `ticket-${t.id}`,
        text:
          t.status === 'Resolved'
            ? `Your ticket ${t.token || ''} was resolved`
            : t.status === 'Waiting Approval'
            ? `Your ticket ${t.token || ''} is waiting on approval`
            : `Your ticket ${t.token || ''} is now in progress`,
        time: relativeTime(t.updatedAt || t.submittedAt),
        at: t.updatedAt || t.submittedAt,
        // Resolved is the one state that's actually "new news" worth a
        // dot — in-progress/waiting-approval are steady states the
        // employee already knows they're waiting on.
        unread: t.status === 'Resolved',
        tab: 'tickets',
      }));

    const mentionNotifs = mentions.map((m) => ({
      id: `extrahours-mention-${m.id}`,
      text: `${m.loggedBy || 'A teammate'} logged ${m.hours}h on ${m.projectCode} and included you`,
      time: relativeTime(m.createdAt),
      at: m.createdAt,
      unread: true,
      tab: 'tasks',
    }));

    return [...ticketNotifs, ...mentionNotifs]
      .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
      .slice(0, 20);
  }, [tickets, mentions]);
}
