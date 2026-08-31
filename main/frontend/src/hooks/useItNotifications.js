import { useMemo } from 'react';
import { useTickets } from '../context/TicketContext';
import { useApprovals } from '../context/ApprovalContext';
import { relativeTime } from '../utils/tickets';

// IT's real events, same "not seeded mock" philosophy as useHrNotifications:
// unclaimed tickets in the IT queue, IT's own approval requests (Data
// Transfer, Asset/VPN — submitApprovalRequest defaults `source` to 'IT' on
// the backend, see approvalController.js) still awaiting the Founder, and
// IT's own requests that were just decided either way.
export function useItNotifications() {
  const { tickets } = useTickets();
  const { approvals } = useApprovals();

  return useMemo(() => {
    const ticketNotifs = tickets
      .filter((t) => t.dept === 'IT' && t.status === 'Open')
      .map((t) => ({
        id: `ticket-${t.id}`,
        text: `New ticket ${t.token || ''} from ${t.user || 'someone'}: ${t.title}`,
        time: relativeTime(t.submittedAt),
        at: t.submittedAt,
        unread: true,
        tab: 'tickets',
      }));

    const itApprovals = approvals.filter((a) => a.source === 'IT');
    const pendingNotifs = itApprovals
      .filter((a) => a.status === 'pending_founder' || a.status === 'pending')
      .map((a) => ({
        id: `approval-pending-${a.id}`,
        text: `${a.title} is waiting for approval`,
        time: a.timestamp,
        at: a.createdAt,
        unread: true,
        tab: 'approval',
      }));
    const decidedNotifs = itApprovals
      .filter((a) => a.status === 'approved' || a.status === 'rejected' || a.status === 'not_approved')
      .map((a) => ({
        id: `approval-decided-${a.id}`,
        text: `${a.title} was ${a.status === 'approved' ? 'approved' : 'rejected'}`,
        time: relativeTime(a.decidedAt),
        at: a.decidedAt,
        // A decision is informational, not something still waiting on IT —
        // no unread dot, mirrors how HR's hook only dots things still pending.
        unread: false,
        tab: 'approval',
      }));

    return [...ticketNotifs, ...pendingNotifs, ...decidedNotifs]
      .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
      .slice(0, 20);
  }, [tickets, approvals]);
}
