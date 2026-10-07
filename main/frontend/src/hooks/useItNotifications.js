import { useMemo } from 'react';
import { useTickets } from '../context/TicketContext';
import { useApprovals } from '../context/ApprovalContext';
import { relativeTime } from '../utils/tickets';
import { useNotificationReadState } from './useNotificationReadState';

// IT's real events, same "not seeded mock" philosophy as useHrNotifications:
// unclaimed tickets in the IT queue, IT's own approval requests (Data
// Transfer, Asset/VPN — submitApprovalRequest defaults `source` to 'IT' on
// the backend, see approvalController.js) still awaiting the Founder, and
// IT's own requests that were just decided either way.
export function useItNotifications() {
  const { tickets } = useTickets();
  const { approvals } = useApprovals();
  const { isRead } = useNotificationReadState();

  return useMemo(() => {
    const ticketNotifs = tickets
      .filter((t) => t.dept === 'IT' && t.status === 'Open')
      .map((t) => ({
        id: `ticket-${t.id}`,
        text: `New ticket ${t.token || ''} from ${t.user || 'someone'}: ${t.title}`,
        time: relativeTime(t.submittedAt),
        at: t.submittedAt,
        tab: 'tickets',
      }));

    // The requester wrote last in the ticket's chat - IT owes a reply. The
    // id carries the message time, so each new message is a fresh
    // notification even if the previous one was already opened.
    const chatNotifs = tickets
      .filter((t) => t.dept === 'IT' && t.lastMessageBy === 'requester' && t.lastMessageAt && t.status !== 'Resolved')
      .map((t) => ({
        id: `chat-${t.id}-${t.lastMessageAt}`,
        text: `${t.user || 'Requester'} replied on ${t.token || 'a ticket'}: ${t.remarks}`,
        time: relativeTime(t.lastMessageAt),
        at: t.lastMessageAt,
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
        tab: 'approval',
      }));
    const decidedNotifs = itApprovals
      .filter((a) => a.status === 'approved' || a.status === 'rejected' || a.status === 'not_approved')
      .map((a) => ({
        id: `approval-decided-${a.id}`,
        text: `${a.title} was ${a.status === 'approved' ? 'approved' : 'rejected'}`,
        time: relativeTime(a.decidedAt),
        at: a.decidedAt,
        tab: 'approval',
      }));

    return [...ticketNotifs, ...chatNotifs, ...pendingNotifs, ...decidedNotifs]
      .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
      .slice(0, 20)
      // "Unread" = not opened yet on this device (see useNotificationReadState).
      // A decision (approved/rejected) is informational, so it never dots.
      .map((n) => ({ ...n, unread: !n.id.startsWith('approval-decided-') && !isRead(n.id) }));
  }, [tickets, approvals, isRead]);
}
