import { useMemo } from 'react';
import { useTickets } from '../context/TicketContext';
import { useLeave, isFounderApproval } from '../context/LeaveContext';
import { useApprovals } from '../context/ApprovalContext';
import { relativeTime } from '../utils/tickets';

// Shared by HrLayout's notification bell and the Overview dashboard's
// "Notifications" stat card, so both read the exact same live list instead
// of one polling real data and the other showing a static mock count.
// Real events, not seeded mock notifications — anything HR still needs to
// act on: tickets nobody's started yet, leave requests still awaiting a
// decision, and HR's own approval requests still waiting on the founder's
// sign-off. There's no persisted "read" state for any of these (no backend
// model for it), so "unread" here just means "still pending" — it clears
// itself the moment the ticket/leave/approval is actually handled.
export function useHrNotifications() {
  const { tickets } = useTickets();
  const { leaveRequests } = useLeave();
  const { approvals } = useApprovals();

  return useMemo(() => {
    const ticketNotifs = tickets
      .filter((t) => t.status === 'Open')
      .map((t) => ({
        id: `ticket-${t.id}`,
        text: `New ticket from ${t.user || 'someone'}: ${t.title}`,
        time: relativeTime(t.submittedAt),
        at: t.submittedAt,
        unread: true,
        path: '/hr/tickets',
      }));
    const leaveNotifs = leaveRequests
      // Admin/Ops and IT leave routes to the Founder to decide, not HR (see
      // isFounderApproval) — surfacing it here would look actionable when
      // HR actually can't do anything with it.
      .filter((l) => l.status === 'Pending' && !isFounderApproval(l))
      .map((l) => ({
        id: `leave-${l.id}`,
        text: `Leave request from ${l.employee || 'someone'} awaiting approval`,
        time: relativeTime(l.submitted_at),
        at: l.submitted_at,
        unread: true,
        path: '/hr/approvals',
      }));
    const approvalNotifs = approvals
      // Only HR's own submitted requests — the Founder's queue, not HR's.
      .filter((a) => a.source === 'HR' && a.status === 'pending_founder')
      .map((a) => ({
        id: `approval-${a.id}`,
        text: `Approval request pending founder sign-off: ${a.title}`,
        time: a.timestamp,
        at: a.createdAt,
        unread: true,
        path: '/hr/approvals',
      }));
    return [...ticketNotifs, ...leaveNotifs, ...approvalNotifs]
      .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
      .slice(0, 20);
  }, [tickets, leaveRequests, approvals]);
}
