import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useTickets } from '../context/TicketContext';
import { useApprovals } from '../context/ApprovalContext';
import { useAssets } from '../context/AssetContext';
import ItDeskLayout from '../components/ItDeskLayout';
import ItDatePicker from '../components/ItDatePicker';
import DonutChart from '../components/DonutChart';
import DataTransferModal from '../components/DataTransferModal';
import TicketsQueueView, { TICKET_STATUSES } from '../components/TicketsQueueView';
import ApprovalCenterView from '../components/ApprovalCenterView';
import DataRequestsView from '../components/DataRequestsView';
import AssetsView, { ASSET_TYPE_ICON } from '../components/AssetsView';
import ReportsView from '../components/ReportsView';
import RenderingStatusView from '../components/RenderingStatusView';
import { Card, SectionHeader, StatCard, DarkMetricCard } from '../components/ui';
import { ASSET_TYPES } from '../data/itMockData';
import { Activity, Server, ShieldCheck, CheckCircle2 } from 'lucide-react';

// Composition root for the IT Service Desk - each tab's view used to be a
// top-level component defined inline in this same 1317-line file (Data
// Requests, Asset Management, Reports & Logs, Rendering Status); each now
// lives in its own file under components/ and is just switched on here.
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  const { approvals, submitApproval } = useApprovals();
  const itPendingFounder = approvals.filter((a) => a.source === 'IT' && a.status === 'pending_founder').length;
  const { assets } = useAssets();

  // Data Requests state
  const [dataRequests, setDataRequests] = useState([
    { id: 1, path: 'Server 70  →  Server 131', name: 'Project Data', status: 'In Progress' },
    { id: 2, path: 'Server 50  →  Server 70', name: 'Backup Files', status: 'Completed' },
    { id: 3, path: 'Server 29  →  Server 131', name: 'Client Records', status: 'Open' },
    { id: 4, path: 'Anima  →  Server 70', name: 'Media Files', status: 'In Progress' },
    { id: 5, path: 'Server 131  →  Anima', name: 'Reports', status: 'Waiting Approval' },
  ]);

  // Certain servers carry a standing rule about who signs off, or what tag
  // the request should always carry - set once here rather than left for
  // whoever fills the form to remember every time.
  function routingFor(server) {
    if (server === 'Server 100') return { approver: "Payel Ma'am (HR Manager)" };
    if (server === 'Server 121') return { approver: 'Rathish sir (Founder)' };
    if (server === 'Server 70') return { tag: 'Priority Wise' };
    if (server === 'Server 50') return { tag: 'Tag Every Time' };
    if (server === 'Server 131') return { tag: 'Standard Queue' };
    return {};
  }

  // Awaited by the modal - when the request needs a named approver, the
  // linked approval record is a real backend write (submitApproval now
  // rethrows on failure) and must succeed before this reports success;
  // otherwise the local request list would show "Waiting Approval" with no
  // approval ever created for the approver to see.
  async function handleNewDataRequest(req) {
    const rule = routingFor(req.source).approver || routingFor(req.source).tag
      ? routingFor(req.source)
      : routingFor(req.destination);
    const targetApprover = rule.approver || null;
    const serverTag = rule.tag || null;
    const status = targetApprover ? 'Waiting Approval' : req.status || 'Waiting Approval';

    if (targetApprover) {
      await submitApproval({
        title: `Data Transfer Approval: ${req.folder || 'Data Copy'}`,
        sub: `${req.source} → ${req.destination} · Approver: ${targetApprover}`,
        requestedBy: req.requesterName || 'IT Desk',
        priority: req.priority === 'Critical' ? 'high' : (req.priority || 'medium').toLowerCase(),
        category: 'Data Transfer',
      });
    }

    setDataRequests((prev) => [
      {
        id: Date.now(),
        path: `${req.source}  →  ${req.destination}`,
        name: req.folder || 'Data Copy',
        status,
        requesterName: req.requesterName,
        requesterNumber: req.requesterNumber,
        backupName: req.backupName,
        priority: req.priority,
        purpose: req.purpose,
        targetApprover,
        serverTag,
      },
      ...prev,
    ]);

    toast.success('Data transfer requested', {
      description: targetApprover ? `Routed to ${targetApprover} for approval.` : `${req.source} → ${req.destination}`,
    });
  }

  // Status changes are the most-repeated action in the queue, so the toast
  // stays terse and carries an Undo instead of a description.
  function changeTicketStatusWithUndo(id, status) {
    const before = recentTickets.find((t) => t.id === id);
    changeTicketStatus(id, status);
    toast.success(`${before?.token || 'Ticket'} → ${status}`, {
      action: before ? { label: 'Undo', onClick: () => changeTicketStatus(id, before.status) } : undefined,
    });
  }

  // Shared with the Employee dashboard - a ticket raised there appears
  // here immediately, and a status change made here reflects there too.
  const { tickets: recentTickets, changeStatus: changeTicketStatus, updateTicketField, hasMoreTickets, loadMoreTickets, loadingMore: loadingMoreTickets } = useTickets();

  // Donut chart data - derived from the live IT ticket list rather than
  // hard-coded, same reasoning as statusData below: it should actually move
  // as tickets come and go instead of always reading "248 total".
  const CATEGORY_COLOR = {
    'Laptop / Desktop / Server': 'hsl(var(--chart-1))',
    Networking: 'hsl(var(--chart-2))',
    'Software Requests': 'hsl(var(--chart-3))',
    VPN: 'hsl(var(--chart-4))',
  };
  const categoryData = useMemo(() => {
    const itTickets = recentTickets.filter((t) => t.dept === 'IT');
    const counts = {};
    itTickets.forEach((t) => {
      const key = t.category || 'Other';
      counts[key] = (counts[key] || 0) + 1;
    });
    const total = itTickets.length || 1;
    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      percent: Math.round((value / total) * 100),
      color: CATEGORY_COLOR[label] || 'hsl(var(--chart-5))',
    }));
  }, [recentTickets]);
  const categoryTotal = recentTickets.filter((t) => t.dept === 'IT').length;

  // Resolved + Closed against everything raised - the closest real proxy to
  // "SLA compliance" available without a per-ticket due-date/SLA field to
  // measure against. Shows a dash rather than a misleading 0%/100% when
  // there's no ticket history yet to compute from.
  const slaCompliance = useMemo(() => {
    if (recentTickets.length === 0) return null;
    const met = recentTickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;
    return Math.round((met / recentTickets.length) * 100);
  }, [recentTickets]);

  // Derived from the live ticket list rather than hard-coded. The previous
  // fixed figures summed to 174%, which the old hand-rolled donut rendered as
  // overlapping arcs - and they never moved when a ticket changed status.
  const statusData = useMemo(() => {
    const tone = {
      Open: 'hsl(var(--chart-1))',
      'In Progress': 'hsl(var(--chart-2))',
      'Waiting Approval': 'hsl(var(--chart-6))',
      Resolved: 'hsl(var(--chart-5))',
      Closed: 'hsl(var(--chart-1))',
    };
    return TICKET_STATUSES.map((s) => ({
      label: s,
      value: recentTickets.filter((t) => t.status === s).length,
      color: tone[s],
    })).filter((d) => d.value > 0);
  }, [recentTickets]);

  const searchIndex = useMemo(
    () => [
      ...recentTickets.map((t) => ({ group: 'Tickets', label: `${t.token}: ${t.title}`, sub: `${t.user} · ${t.status}`, tab: 'tickets' })),
      ...approvals.filter((a) => a.source === 'IT').map((a) => ({ group: 'Approvals', label: a.title, sub: `${a.requestedBy} · ${a.status}`, tab: 'approval' })),
      ...dataRequests.map((d) => ({ group: 'Data Requests', label: d.path, sub: `${d.name} · ${d.status}`, tab: 'datarequests' })),
    ],
    [recentTickets, approvals, dataRequests]
  );

  return (
    <ItDeskLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      searchIndex={searchIndex}
      role="it"
      approvalCount={itPendingFounder}
    >
      {activeTab === 'dashboard' && (
        <div className="w-full flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1">IT Service Desk</h1>
              <p className="text-xs text-muted-foreground">Overview of active tickets, pending approvals, and IT infrastructure.</p>
            </div>
            <ItDatePicker />
          </div>

          {/* Key Stat Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <StatCard label="Total Tickets" value={recentTickets.length} sub="all tickets" />
            <StatCard label="Open Tickets" value={recentTickets.filter((t) => t.status === 'Open').length} sub="active" />
            <StatCard label="Pending Approval" value={itPendingFounder} sub="awaiting founder" />
            <StatCard label="Resolved Tickets" value={recentTickets.filter((t) => t.status === 'Resolved').length} sub="completed" />
            <StatCard label="In Progress" value={recentTickets.filter((t) => t.status === 'In Progress').length} sub="working" />
            <StatCard label="SLA Compliance" value={slaCompliance === null ? '-' : `${slaCompliance}%`} sub="resolved of raised" />
          </div>

          {/* Donut Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <DonutChart title="Tickets by Category" total={categoryTotal} data={categoryData} />
            <DonutChart title="Tickets by Status" total={recentTickets.length} data={statusData} />
          </div>

          {/* Assets Overview */}
          <Card className="!p-3.5">
            <SectionHeader
              title="Assets Overview"
              action={
                <button
                  type="button"
                  onClick={() => setActiveTab('assets')}
                  className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                >
                  View All
                </button>
              }
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-center mb-2.5">
              {ASSET_TYPES.map((type) => {
                const Icon = ASSET_TYPE_ICON[type];
                return (
                  <div key={type} className="p-2 rounded-xl bg-muted border border-border">
                    <Icon size={16} className="mx-auto text-muted-foreground mb-0.5" />
                    <div className="text-xs text-muted-foreground">{type}s</div>
                    <div className="text-xs font-bold text-foreground mt-0.5">
                      {assets.filter((a) => a.type === type).length}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'tickets' && (
        <TicketsQueueView
          tickets={recentTickets}
          onStatusChange={changeTicketStatusWithUndo}
          onFieldChange={updateTicketField}
          hasMoreTickets={hasMoreTickets}
          loadMoreTickets={loadMoreTickets}
          loadingMoreTickets={loadingMoreTickets}
        />
      )}

      {activeTab === 'approval' && <ApprovalCenterView />}

      {activeTab === 'datarequests' && (
        <DataRequestsView requests={dataRequests} onNewRequest={() => setIsDataModalOpen(true)} />
      )}

      {activeTab === 'assets' && <AssetsView />}

      {activeTab === 'reports' && <ReportsView />}

      {activeTab === 'renderstatus' && <RenderingStatusView />}

      {/* Modals */}
      <DataTransferModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onSubmitSuccess={handleNewDataRequest}
      />
    </ItDeskLayout>
  );
}
