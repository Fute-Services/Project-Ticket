import HrLayout from '../../components/hr/HrLayout';
import ApprovalCenterView from '../../components/ApprovalCenterView';

// Same Approval Center as the IT Service Desk (components/ApprovalCenterView.jsx)
// — requests submitted here go to the same approvals collection with
// source: 'HR', which is exactly what the Founder's Approval Center's
// "HR Ticket Approvals" panel reads (components/FounderApprovalView.jsx).
export default function HrApprovals() {
  return (
    <HrLayout>
      <ApprovalCenterView source="HR" />
    </HrLayout>
  );
}
