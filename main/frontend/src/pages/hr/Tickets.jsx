import HrLayout from '../../components/hr/HrLayout';
import TicketsQueueView from '../../components/TicketsQueueView';
import { useTickets } from '../../context/TicketContext';
import { useApprovals } from '../../context/ApprovalContext';

// Same Tickets Queue design as the IT Service Desk (components/TicketsQueueView.jsx)
// — HR's own hr_complaints collection, reached at this dedicated route instead of
// only being visible inside the Founder's dashboard. The Approvals column reads
// from the same `approvals` collection the Founder's Approval Center decides
// against, so a decision made there shows up here without HR ever opening
// the Founder's dashboard (RequireAuth.jsx keeps that role-gated).
export default function HrTickets() {
  const { tickets, changeStatus, updateTicketField } = useTickets();
  const { approvals } = useApprovals();

  return (
    <HrLayout>
      <TicketsQueueView
        tickets={tickets}
        onStatusChange={changeStatus}
        onFieldChange={updateTicketField}
        deptLabel="HR"
        approvals={approvals}
      />
    </HrLayout>
  );
}
