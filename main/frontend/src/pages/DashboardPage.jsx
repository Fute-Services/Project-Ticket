import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { useApprovals } from '../context/ApprovalContext';
import { toast } from 'sonner';
import ItDeskLayout from '../components/ItDeskLayout';
import DonutChart from '../components/DonutChart';
import DataTransferModal from '../components/DataTransferModal';
import AssetFormModal from '../components/AssetFormModal';
import DataTable from '../components/DataTable';
import { BarChartCard, LineChartCard } from '../components/charts';
import { Card, SectionHeader, StatCard } from '../components/ui';
import {
  assets as SEED_ASSETS,
  ASSET_TYPES,
  slaWeekly,
  resolutionByCategory,
} from '../data/itMockData';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Server,
  Monitor,
  Laptop,
  Printer,
  Wifi,
  Plus,
  Pencil,
  Trash2,
  Download,
  Mail,
  BadgeCheck,
} from 'lucide-react';

const TICKET_STATUSES = ['Open', 'In Progress', 'Waiting Approval', 'Resolved', 'Closed'];

function TicketsQueueView({ tickets, onStatusChange }) {
  const [filter, setFilter] = useState('All');
  const visible = filter === 'All' ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Tickets Queue</h1>
          <p className="text-xs text-muted-foreground">{tickets.length} total tickets</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex flex-wrap gap-2 mb-5">
          {['All', ...TICKET_STATUSES].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <DataTable
          rows={visible}
          pageSize={12}
          emptyMessage={
            filter === 'All'
              ? 'No tickets have been raised yet. They appear here as employees submit them.'
              : `No tickets are currently ${filter.toLowerCase()}.`
          }
          columns={[
            {
              key: 'token',
              label: 'Token',
              width: '110px',
              render: (t) => <span className="font-bold text-primary">{t.token}</span>,
            },
            { key: 'title', label: 'Issue', render: (t) => <span className="text-foreground">{t.title}</span> },
            { key: 'user', label: 'Requester', render: (t) => <span className="text-muted-foreground">{t.user}</span> },
            { key: 'dept', label: 'Department', render: (t) => <span className="text-muted-foreground">{t.dept}</span> },
            {
              key: 'status',
              label: 'Status',
              width: '150px',
              render: (t) => (
                <select
                  value={t.status}
                  onChange={(e) => onStatusChange(t.id, e.target.value)}
                  aria-label={`Status for ticket ${t.token}`}
                  className="bg-muted border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

const APPROVAL_FORM_EMPTY = { title: '', sub: '', requestedBy: '', priority: 'medium' };

function ApprovalCenterView() {
  const { approvals, submitApproval } = useApprovals();
  const itApprovals = approvals.filter((a) => a.source === 'IT');
  const pendingFounder = itApprovals.filter((a) => a.status === 'pending_founder');
  const decided = itApprovals.filter((a) => a.status !== 'pending_founder');
  const [form, setForm] = useState(APPROVAL_FORM_EMPTY);

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Give the request a title', {
        description: 'The founder needs to know what they are approving.',
      });
      return;
    }
    submitApproval({ ...form, source: 'IT' });
    setForm(APPROVAL_FORM_EMPTY);
    toast.success('Sent for founder approval', { description: form.title });
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Approval Center</h1>
        <p className="text-xs text-muted-foreground">{pendingFounder.length} awaiting founder sign-off · {decided.length} decided</p>
      </div>

      <Card>
        <h3 className="font-semibold text-sm text-foreground mb-3">Send for Founder Approval</h3>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Request title"
            className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <input
            value={form.requestedBy}
            onChange={(e) => setForm((f) => ({ ...f, requestedBy: e.target.value }))}
            placeholder="Requested by"
            className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <input
            value={form.sub}
            onChange={(e) => setForm((f) => ({ ...f, sub: e.target.value }))}
            placeholder="Details"
            className="sm:col-span-2 bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="sm:col-span-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Send for Founder Approval
          </button>
        </form>
      </Card>

      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-semibold text-sm text-foreground mb-4">Awaiting Founder Sign-off</h3>
        {pendingFounder.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">Nothing waiting on the founder right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {pendingFounder.map((app) => (
              <div key={app.id} className="p-3.5 rounded-lg bg-muted border border-border flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-foreground truncate">{app.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{app.sub}</div>
                  <div className="text-xs text-muted-foreground">Requested by {app.requestedBy} · {app.timestamp}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full border font-bold capitalize shrink-0 bg-warning/10 text-warning border-warning/20">
                  Pending Founder
                </span>
              </div>
            ))}
          </div>
        )}

        <h3 className="font-semibold text-sm text-foreground mb-4">Decision History</h3>
        {decided.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">No decisions yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {decided.map((app) => (
              <div key={app.id} className="p-3.5 rounded-lg bg-muted border border-border flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-foreground truncate">{app.title}</div>
                  <div className="text-xs text-muted-foreground">{app.requestedBy} · {app.timestamp}</div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-bold capitalize shrink-0 ${
                    app.status === 'approved'
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-destructive/10 text-destructive border-destructive/20'
                  }`}
                >
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DataRequestsView({ requests, onNewRequest }) {
  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Data Requests</h1>
          <p className="text-xs text-muted-foreground">{requests.length} transfer requests</p>
        </div>
        <button
          type="button"
          onClick={onNewRequest}
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
        >
          <Server size={15} />
          <span>New Data Request</span>
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        {requests.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No data transfer requests yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {requests.map((d) => (
              <div key={d.id} className="p-3.5 rounded-lg bg-muted border border-border flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning shrink-0">
                    <Server size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground truncate">{d.path}</div>
                    <div className="text-xs text-muted-foreground truncate">{d.name}</div>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-semibold shrink-0 ${
                    d.status === 'Completed'
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : d.status === 'In Progress'
                      ? 'bg-muted/10 text-muted-foreground border-muted/20'
                      : 'bg-warning/10 text-warning border-warning/20'
                  }`}
                >
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const ASSET_TYPE_ICON = {
  Laptop,
  Desktop: Monitor,
  Server,
  Network: Wifi,
  Printer,
};

const ASSET_STATUS_COLOR = {
  'In Use': 'bg-primary/10 text-primary border-primary/20',
  Available: 'bg-muted/10 text-muted-foreground border-muted/20',
  'Under Repair': 'bg-warning/10 text-warning border-warning/20',
  Retired: 'bg-muted/10 text-muted-foreground border-muted/20',
};

function AssetsView() {
  const [assets, setAssets] = useState(SEED_ASSETS);
  const [typeFilter, setTypeFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  // Only the type filter lives here now — free-text search is DataTable's job,
  // so the two aren't implemented twice with subtly different behaviour.
  const visible = assets.filter((a) => typeFilter === 'All' || a.type === typeFilter);

  // Warranty is "expiring" if it lapses within 90 days of the demo date —
  // the whole point of tracking it is catching that before it lapses.
  const soon = new Date('2026-08-06');
  soon.setDate(soon.getDate() + 90);
  const expiring = assets.filter((a) => new Date(a.warrantyEnd) <= soon && a.status !== 'Retired').length;

  function openAddModal() {
    setEditingAsset(null);
    setModalOpen(true);
  }

  function openEditModal(asset) {
    setEditingAsset(asset);
    setModalOpen(true);
  }

  function handleSubmit(asset) {
    const isEdit = !!editingAsset;
    setAssets((prev) => (isEdit ? prev.map((a) => (a.id === editingAsset.id ? asset : a)) : [asset, ...prev]));
    toast.success(isEdit ? `Saved ${asset.id}` : `Added ${asset.id}`, { description: asset.model });
  }

  // Deleting an asset can't be undone from this screen, so the toast carries
  // an Undo rather than just reporting the loss after the fact.
  function handleDelete(id) {
    const removed = assets.find((a) => a.id === id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
    toast.success(`Deleted ${id}`, {
      description: removed?.model,
      action: {
        label: 'Undo',
        onClick: () => setAssets((prev) => (prev.some((a) => a.id === id) ? prev : [removed, ...prev])),
      },
    });
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Asset Management</h1>
          <p className="text-xs text-muted-foreground">
            {assets.length} assets tracked · {expiring} warranty expiring within 90 days
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
        >
          <Plus size={15} />
          <span>Add Asset</span>
        </button>
      </div>

      {/* Counts per type */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ASSET_TYPES.map((type) => {
          const Icon = ASSET_TYPE_ICON[type];
          const count = assets.filter((a) => a.type === type).length;
          const inUse = assets.filter((a) => a.type === type && a.status === 'In Use').length;
          return (
            <div key={type} className="bg-card border border-border rounded-lg p-3.5 text-center">
              <Icon size={18} className="mx-auto text-muted-foreground mb-1.5" />
              <div className="text-xs text-muted-foreground">{type}s</div>
              <div className="text-lg font-bold text-foreground mt-0.5">{count}</div>
              <div className="text-xs text-primary">{inUse} in use</div>
            </div>
          );
        })}
      </div>

      <Card>
        <div className="flex flex-wrap gap-2 mb-4">
          {['All', ...ASSET_TYPES].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                typeFilter === t ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'All' ? 'All' : `${t}s`}
            </button>
          ))}
        </div>

        <DataTable
          rows={visible}
          pageSize={10}
          searchable
          searchKeys={['id', 'model', 'assignedTo', 'department']}
          searchPlaceholder="Search by asset ID, model, user, or department…"
          emptyMessage="No assets of this type are on record yet."
          emptyAction={
            <button
              type="button"
              onClick={openAddModal}
              className="mt-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Add an asset
            </button>
          }
          columns={[
            {
              key: 'id',
              label: 'Asset ID',
              width: '110px',
              render: (a) => <span className="font-bold text-primary">{a.id}</span>,
            },
            { key: 'model', label: 'Model', render: (a) => <span className="text-foreground">{a.model}</span> },
            { key: 'assignedTo', label: 'Assigned To', render: (a) => <span className="text-muted-foreground">{a.assignedTo}</span> },
            { key: 'department', label: 'Department', render: (a) => <span className="text-muted-foreground">{a.department}</span> },
            { key: 'purchaseDate', label: 'Purchased', render: (a) => <span className="text-muted-foreground">{a.purchaseDate}</span> },
            {
              key: 'warrantyEnd',
              label: 'Warranty Until',
              render: (a) => {
                const expiringSoon = new Date(a.warrantyEnd) <= soon && a.status !== 'Retired';
                return (
                  <span className={expiringSoon ? 'text-warning font-semibold' : 'text-muted-foreground'}>
                    {a.warrantyEnd}
                  </span>
                );
              },
            },
            {
              key: 'status',
              label: 'Status',
              render: (a) => (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap ${ASSET_STATUS_COLOR[a.status]}`}>
                  {a.status}
                </span>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              sortable: false,
              width: '90px',
              render: (a) => (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(a)}
                    className="w-7 h-7 rounded-lg bg-muted border border-border hover:border-muted-foreground/40 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                    aria-label={`Edit asset ${a.id}`}
                    title="Edit"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="w-7 h-7 rounded-lg bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 text-destructive flex items-center justify-center cursor-pointer transition-colors"
                    aria-label={`Delete asset ${a.id}`}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <AssetFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialAsset={editingAsset}
        nextId={`AST-${1000 + assets.length + 1}`}
      />
    </div>
  );
}

function ReportsView() {
  const totalMet = slaWeekly.reduce((s, w) => s + w.met, 0);
  const totalBreached = slaWeekly.reduce((s, w) => s + w.breached, 0);
  const slaPct = Math.round((totalMet / (totalMet + totalBreached)) * 100);
  const avgResolution = (slaWeekly.reduce((s, w) => s + w.avgHours, 0) / slaWeekly.length).toFixed(1);

  function exportCsv() {
    const headers = ['Week', 'SLA Met', 'SLA Breached', 'Avg Resolution (hrs)'];
    const rows = slaWeekly.map((w) => [w.week, w.met, w.breached, w.avgHours]);
    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'it-sla-report.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Reports & Logs</h1>
          <p className="text-xs text-muted-foreground">SLA compliance and resolution velocity, last 6 weeks</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
        >
          <Download size={14} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard icon={ShieldCheck} label="SLA Compliance" value={`${slaPct}%`} sub="last 6 weeks" accent="#10b981" />
        <StatCard icon={CheckCircle2} label="Tickets Resolved" value={totalMet + totalBreached} sub="last 6 weeks" accent="#3b82f6" />
        <StatCard icon={AlertTriangle} label="SLA Breaches" value={totalBreached} sub="needs review" accent="#ef4444" />
        <StatCard icon={Clock} label="Avg Resolution" value={`${avgResolution}h`} sub="mean time to resolve" accent="#f97316" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BarChartCard
          title="Weekly SLA Performance"
          subtitle="Met vs breached per week"
          data={slaWeekly}
          xKey="week"
          stacked
          series={[
            { key: 'met', label: 'Met', color: 'hsl(var(--success))' },
            { key: 'breached', label: 'Breached', color: 'hsl(var(--destructive))' },
          ]}
        />

        <LineChartCard
          title="Resolution Time Trend"
          subtitle="Mean hours to resolve, by week"
          data={slaWeekly}
          xKey="week"
          unit="h"
          series={[{ key: 'avgHours', label: 'Avg hours', color: 'hsl(var(--primary))' }]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <SectionHeader title="Resolution Time by Category" subtitle="Average hours to close" />
          <div className="flex flex-col gap-3">
            {resolutionByCategory.map((c) => {
              const maxHours = Math.max(...resolutionByCategory.map((r) => r.avgHours));
              return (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-40 shrink-0 truncate">{c.category}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-warning rounded-full"
                      style={{ width: `${(c.avgHours / maxHours) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground w-12 text-right shrink-0">{c.avgHours}h</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const { approvals } = useApprovals();
  const itPendingFounder = approvals.filter((a) => a.source === 'IT' && a.status === 'pending_founder').length;

  // Data Requests state
  const [dataRequests, setDataRequests] = useState([
    { id: 1, path: 'Server 70  →  Server 131', name: 'Project Data', status: 'In Progress' },
    { id: 2, path: 'Server 50  →  Server 70', name: 'Backup Files', status: 'Completed' },
    { id: 3, path: 'Server 29  →  Server 131', name: 'Client Records', status: 'Open' },
    { id: 4, path: 'Anima  →  Server 70', name: 'Media Files', status: 'In Progress' },
    { id: 5, path: 'Server 131  →  Anima', name: 'Reports', status: 'Waiting Approval' },
  ]);

  function handleNewDataRequest(req) {
    setDataRequests((prev) => [
      {
        id: Date.now(),
        path: `${req.source}  →  ${req.destination}`,
        name: req.folder || 'Data Copy',
        status: req.status || 'Waiting Approval',
      },
      ...prev,
    ]);
    toast.success('Data transfer requested', {
      description: `${req.source} → ${req.destination}`,
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

  // Donut chart data definitions
  const categoryData = [
    { label: 'Laptop/Desktop Issues', value: 99, percent: 40, color: 'hsl(var(--chart-1))' },
    { label: 'Network Issues', value: 62, percent: 25, color: 'hsl(var(--chart-2))' },
    { label: 'Software Requests', value: 37, percent: 15, color: 'hsl(var(--chart-3))' },
    { label: 'VPN Requests', value: 25, percent: 10, color: 'hsl(var(--chart-4))' },
    { label: 'Data Requests', value: 25, percent: 10, color: 'hsl(var(--chart-5))' },
  ];

  // Shared with the Employee dashboard — a ticket raised there appears
  // here immediately, and a status change made here reflects there too.
  const { tickets: recentTickets, changeStatus: changeTicketStatus } = useTickets();

  // Derived from the live ticket list rather than hard-coded. The previous
  // fixed figures summed to 174%, which the old hand-rolled donut rendered as
  // overlapping arcs — and they never moved when a ticket changed status.
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
      ...recentTickets.map((t) => ({ group: 'Tickets', label: `${t.token} — ${t.title}`, sub: `${t.user} · ${t.status}`, tab: 'tickets' })),
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
            <div className="flex items-center gap-2.5">
              {emailVerified ? (
                <span className="bg-primary/10 border border-primary/20 text-primary font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2">
                  <BadgeCheck size={15} />
                  <span>Verified</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => { setEmailVerified(true); toast.success('Verification email sent', { description: user?.email || 'Check your inbox to confirm your address.' }); }}
                  className="bg-muted border border-border hover:border-muted-foreground/40 text-muted-foreground hover:text-foreground font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Mail size={15} />
                  <span>Send Verification Email</span>
                </button>
              )}
            </div>
          </div>

          {/* Key Stat Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <StatCard label="Total Tickets" value={recentTickets.length} sub="all tickets" />
            <StatCard label="Open Tickets" value={recentTickets.filter((t) => t.status === 'Open').length} sub="active" />
            <StatCard label="Pending Approval" value={itPendingFounder} sub="awaiting founder" />
            <StatCard label="Resolved Tickets" value={recentTickets.filter((t) => t.status === 'Resolved').length} sub="completed" />
            <StatCard label="In Progress" value={recentTickets.filter((t) => t.status === 'In Progress').length} sub="working" />
            <StatCard label="SLA Compliance" value="96%" sub="last 7 days" />
          </div>

          {/* Donut Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <DonutChart title="Tickets by Category" total={248} data={categoryData} />
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
              <div className="p-2 rounded-xl bg-muted border border-border">
                <Laptop size={16} className="mx-auto text-muted-foreground mb-0.5" />
                <div className="text-xs text-muted-foreground">Laptops</div>
                <div className="text-xs font-bold text-foreground mt-0.5">120</div>
              </div>
              <div className="p-2 rounded-xl bg-muted border border-border">
                <Monitor size={16} className="mx-auto text-muted-foreground mb-0.5" />
                <div className="text-xs text-muted-foreground">Desktops</div>
                <div className="text-xs font-bold text-foreground mt-0.5">85</div>
              </div>
              <div className="p-2 rounded-xl bg-muted border border-border">
                <Server size={16} className="mx-auto text-muted-foreground mb-0.5" />
                <div className="text-xs text-muted-foreground">Servers</div>
                <div className="text-xs font-bold text-foreground mt-0.5">28</div>
              </div>
              <div className="p-2 rounded-xl bg-muted border border-border">
                <Wifi size={16} className="mx-auto text-muted-foreground mb-0.5" />
                <div className="text-xs text-muted-foreground">Network</div>
                <div className="text-xs font-bold text-foreground mt-0.5">18</div>
              </div>
              <div className="p-2 rounded-xl bg-muted border border-border">
                <Printer size={16} className="mx-auto text-muted-foreground mb-0.5" />
                <div className="text-xs text-muted-foreground">Printers</div>
                <div className="text-xs font-bold text-foreground mt-0.5">12</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'tickets' && (
        <TicketsQueueView tickets={recentTickets} onStatusChange={changeTicketStatusWithUndo} />
      )}

      {activeTab === 'approval' && <ApprovalCenterView />}

      {activeTab === 'datarequests' && (
        <DataRequestsView requests={dataRequests} onNewRequest={() => setIsDataModalOpen(true)} />
      )}

      {activeTab === 'assets' && <AssetsView />}

      {activeTab === 'reports' && <ReportsView />}

      {/* Modals */}
      <DataTransferModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onSubmitSuccess={handleNewDataRequest}
      />
    </ItDeskLayout>
  );
}
