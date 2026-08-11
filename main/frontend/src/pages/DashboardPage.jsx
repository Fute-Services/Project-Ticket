import React, { useMemo, useState } from 'react';
import { useTickets } from '../context/TicketContext';
import { useApprovals } from '../context/ApprovalContext';
import { useAuth } from '../context/AuthContext';
import { useRenders, frameCount } from '../context/RenderContext';
import { toast } from 'sonner';
import ItDeskLayout from '../components/ItDeskLayout';
import ItDatePicker from '../components/ItDatePicker';
import DonutChart from '../components/DonutChart';
import DataTransferModal from '../components/DataTransferModal';
import AssetFormModal from '../components/AssetFormModal';
import DataTable from '../components/DataTable';
import { BarChartCard, LineChartCard } from '../components/charts';
import { Card, SectionHeader, StatCard, Drawer } from '../components/ui';
import {
  assets as SEED_ASSETS,
  ASSET_TYPES,
  slaWeekly,
  resolutionByCategory,
} from '../data/itMockData';
import {
  Clock,
  CheckCircle2,
  XCircle,
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
  ChevronDown,
  X,
  Search,
  HardDrive,
  History as HistoryIcon,
  Cpu,
  Eye,
  Play,
  Film,
} from 'lucide-react';

const TICKET_STATUSES = ['Open', 'In Progress', 'Waiting Approval', 'Resolved', 'Closed'];

function TicketsQueueView({ tickets, onStatusChange, onFieldChange }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState('All');
  const [detailsTicket, setDetailsTicket] = useState(null);
  const visible = filter === 'All' ? tickets : tickets.filter((t) => t.status === filter);

  function isTicketOwner(t) {
    if (!user) return false;
    const matchesName = user.full_name && t.user && user.full_name.toLowerCase() === t.user.toLowerCase();
    const matchesUsername = user.username && t.username && user.username.toLowerCase() === t.username.toLowerCase();
    const matchesEmailName = user.email && t.username && user.email.toLowerCase().startsWith(t.username.toLowerCase());
    return matchesName || matchesUsername || matchesEmailName;
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Tickets Queue</h1>
          <p className="text-xs text-muted-foreground">{tickets.length} total tickets</p>
        </div>
        <ItDatePicker />
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
              key: 'sno',
              label: 'S.No.',
              width: '60px',
              sortable: false,
              render: (_, index) => <span className="text-muted-foreground font-semibold text-xs">{(index ?? 0) + 1}</span>,
            },
            {
              key: 'date',
              label: 'Date',
              width: '95px',
              render: (t) => <span className="text-muted-foreground text-xs whitespace-nowrap">{t.date || '—'}</span>,
            },
            {
              key: 'username',
              label: 'Username',
              width: '110px',
              render: (t) => <span className="text-foreground font-medium text-xs">{t.username || t.user || '—'}</span>,
            },
            {
              key: 'employeeId',
              label: 'Employee ID',
              width: '110px',
              render: (t) => <span className="font-semibold text-primary text-xs">{t.employeeId || '—'}</span>,
            },
            {
              key: 'vpnNo',
              label: 'VPN ID',
              width: '100px',
              render: (t) => <span className="text-muted-foreground font-mono text-[11px]">{t.vpnNo || '—'}</span>,
            },
            {
              key: 'dept',
              label: 'Department',
              width: '110px',
              render: (t) => <span className="text-muted-foreground text-xs">{t.dept || '—'}</span>,
            },
            {
              key: 'title',
              label: 'Issue',
              width: '180px',
              render: (t) => <span className="text-foreground text-xs font-medium block truncate" title={t.title}>{t.title}</span>,
            },
            {
              key: 'status',
              label: 'IT Dept Status',
              width: '140px',
              render: (t) => (
                <select
                  value={t.status}
                  onChange={(e) => onStatusChange(t.id, e.target.value)}
                  aria-label={`IT Status for ticket ${t.token || t.id}`}
                  className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ),
            },
            {
              key: 'employeeStatus',
              label: 'Employee Status',
              width: '135px',
              render: (t) => {
                const canEdit = isTicketOwner(t);
                if (canEdit) {
                  return (
                    <select
                      value={t.employeeStatus || 'Active'}
                      onChange={(e) => onFieldChange && onFieldChange(t.id, 'employeeStatus', e.target.value)}
                      aria-label={`Employee Status for ticket ${t.token || t.id}`}
                      className="bg-primary/10 border border-primary/30 rounded-lg px-2 py-1 text-xs text-primary font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      {['Active', 'Pending', 'Satisfied', 'Closed'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  );
                }

                const statusStr = t.employeeStatus || 'Active';
                const badgeColor =
                  statusStr === 'Satisfied'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : statusStr === 'Closed'
                    ? 'bg-muted text-muted-foreground border-border'
                    : 'bg-blue-500/10 text-blue-500 border-blue-500/20';

                return (
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold whitespace-nowrap ${badgeColor}`}
                    title="Only the employee who raised this ticket can edit Employee Status"
                  >
                    {statusStr}
                  </span>
                );
              },
            },
            {
              key: 'solver',
              label: 'Solver',
              width: '135px',
              render: (t) => (
                <select
                  value={t.solver || 'Team 1'}
                  onChange={(e) => onFieldChange && onFieldChange(t.id, 'solver', e.target.value)}
                  aria-label={`Solver for ticket ${t.token || t.id}`}
                  className="bg-muted/70 border border-border rounded-lg px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  {['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5', 'Unassigned'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ),
            },
            {
              key: 'remarks',
              label: 'Remarks (Editable)',
              sortable: false,
              width: '180px',
              render: (t) => (
                <input
                  type="text"
                  value={t.remarks || ''}
                  onChange={(e) => onFieldChange && onFieldChange(t.id, 'remarks', e.target.value)}
                  placeholder="Type remarks..."
                  className="w-full bg-background border border-input rounded-md px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60"
                />
              ),
            },
          ]}
        />
      </div>

      {/* Full record — kept out of the grid itself so the queue stays scannable;
          Employee ID / VPN No / Date / Username are metadata you check when you
          need them, not something every row needs to show all the time. */}
      <Drawer open={!!detailsTicket} onClose={() => setDetailsTicket(null)} title={detailsTicket ? `Ticket ${detailsTicket.token}` : 'Ticket'}>
        {detailsTicket && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Issue</div>
              <div className="text-sm font-semibold text-foreground">{detailsTicket.title}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Employee ID</div>
                <div className="text-xs font-semibold text-foreground">{detailsTicket.employeeId || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Username</div>
                <div className="text-xs font-semibold text-foreground">{detailsTicket.username || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">VPN No</div>
                <div className="text-xs font-semibold text-foreground">{detailsTicket.vpnNo || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Date</div>
                <div className="text-xs font-semibold text-foreground">{detailsTicket.date || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Department</div>
                <div className="text-xs font-semibold text-foreground">{detailsTicket.dept || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Requester</div>
                <div className="text-xs font-semibold text-foreground">{detailsTicket.user || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="text-xs font-semibold text-foreground">{detailsTicket.status}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Token</div>
                <div className="text-xs font-semibold text-primary">{detailsTicket.token}</div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

const APPROVAL_FORM_EMPTY = {
  date: new Date().toISOString().slice(0, 10),
  title: '',
  department: 'IT Support',
  sub: '',
  employeeId: '',
  username: '',
  requestedBy: '',
  priority: 'medium',
  category: 'General',
};
const APPROVAL_CATEGORIES = ['General', 'Software', 'Hardware', 'System Access', 'Data Transfer'];

function ApprovalCenterView() {
  const { approvals, submitApproval } = useApprovals();
  const [form, setForm] = useState(APPROVAL_FORM_EMPTY);
  const [sortOrder, setSortOrder] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const itApprovals = approvals.filter((a) => a.source === 'IT');
  const categories = ['All', ...new Set(itApprovals.map((a) => a.category || 'General'))];

  const filtered = itApprovals
    .filter((a) => priorityFilter === 'All' || a.priority === priorityFilter.toLowerCase())
    .filter((a) => categoryFilter === 'All' || (a.category || 'General') === categoryFilter)
    .sort((a, b) => (sortOrder === 'newest' ? (b.createdAt || 0) - (a.createdAt || 0) : (a.createdAt || 0) - (b.createdAt || 0)));

  const pendingFounder = statusFilter === 'Resolved' ? [] : filtered.filter((a) => a.status === 'pending_founder');
  const decided = statusFilter === 'Pending' ? [] : filtered.filter((a) => a.status !== 'pending_founder');

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Give the request a title', {
        description: 'The founder needs to know what they are approving.',
      });
      return;
    }
    submitApproval({
      ...form,
      requestedBy: form.username || form.employeeId || 'IT Support',
      source: 'IT',
    });
    setForm(APPROVAL_FORM_EMPTY);
    toast.success('Sent for founder approval', { description: form.title });
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Approval Center</h1>
          <p className="text-xs text-muted-foreground">{pendingFounder.length} awaiting founder sign-off · {decided.length} decided</p>
        </div>
        <ItDatePicker />
      </div>

      <Card>
        <h3 className="font-semibold text-sm text-foreground mb-3">Send for Founder Approval</h3>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1. Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">Date</label>
            <input
              type="date"
              required
              value={form.date || new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* 2. Request Title */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">Request Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Request title"
              className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* 3. Department */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">Department</label>
            <select
              value={form.department || 'IT Support'}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              aria-label="Department"
              className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              {['IT Support', 'Engineering', 'Network', 'Software', 'VPN', 'Data Team', 'Design', 'HR', 'Finance'].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 4. Details */}
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
            <label className="text-[11px] font-medium text-muted-foreground">Details</label>
            <input
              value={form.sub}
              onChange={(e) => setForm((f) => ({ ...f, sub: e.target.value }))}
              placeholder="Details"
              className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* 5. Employee ID */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">Employee ID</label>
            <input
              value={form.employeeId}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              placeholder="Employee ID (e.g. EMP-2001)"
              className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* 6. Username */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">Username</label>
            <input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="Username (e.g. john.doe)"
              className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Category (Existing) */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              aria-label="Category"
              className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              {APPROVAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Priority (Existing) */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              aria-label="Priority"
              className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <button
            type="submit"
            className="sm:col-span-2 lg:col-span-3 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer mt-1"
          >
            Send for Founder Approval
          </button>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Filter</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            aria-label="Sort order"
            className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          >
            <option value="newest">Datewise: Newest first</option>
            <option value="oldest">Datewise: Oldest first</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Status filter"
            className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          >
            <option value="All">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Resolved">Resolved</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Priority filter"
            className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          >
            <option value="All">All priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Category filter"
            className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>
            ))}
          </select>
        </div>
      </Card>

      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-semibold text-sm text-foreground mb-4">Awaiting Founder Sign-off</h3>
        {pendingFounder.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">Nothing matches these filters.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {pendingFounder.map((app) => (
              <div key={app.id} className="p-3.5 rounded-lg bg-muted border border-border flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-foreground truncate">{app.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{app.sub}</div>
                  <div className="text-xs text-muted-foreground">Requested by {app.requestedBy} · {app.timestamp}</div>
                  <div className="text-xs text-muted-foreground">{app.category || 'General'} · {app.priority}</div>
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
          <p className="text-xs text-muted-foreground py-4">Nothing matches these filters.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {decided.map((app) => (
              <div key={app.id} className="p-3.5 rounded-lg bg-muted border border-border flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-foreground truncate">{app.title}</div>
                  <div className="text-xs text-muted-foreground">{app.requestedBy} · {app.timestamp}</div>
                  <div className="text-xs text-muted-foreground">{app.category || 'General'} · {app.priority}</div>
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
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Data Requests</h1>
          <p className="text-xs text-muted-foreground">{requests.length} transfer requests</p>
        </div>
        <div className="flex items-center gap-2.5">
          <ItDatePicker />
          <button
            type="button"
            onClick={onNewRequest}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
          >
            <Server size={15} />
            <span>New Data Request</span>
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        {requests.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No data transfer requests yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {requests.map((d) => {
              const expanded = expandedId === d.id;
              const hasDetails = d.requesterName || d.requesterNumber || d.backupName || d.priority || d.targetApprover || d.serverTag;
              return (
                <div key={d.id} className="rounded-lg bg-muted border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => hasDetails && setExpandedId(expanded ? null : d.id)}
                    aria-expanded={expanded}
                    className={`w-full p-3.5 flex items-center justify-between gap-3 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning shrink-0">
                        <Server size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">{d.path}</div>
                        <div className="text-xs text-muted-foreground truncate">{d.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                          d.status === 'Completed'
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : d.status === 'In Progress'
                            ? 'bg-muted/10 text-muted-foreground border-muted/20'
                            : 'bg-warning/10 text-warning border-warning/20'
                        }`}
                      >
                        {d.status}
                      </span>
                      {hasDetails && (
                        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </button>

                  {expanded && hasDetails && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                      {d.requesterName && (
                        <div>
                          <div className="text-xs text-muted-foreground">Requester Contact</div>
                          <div className="text-xs font-semibold text-foreground">{d.requesterName}{d.requesterNumber ? ` · ${d.requesterNumber}` : ''}</div>
                        </div>
                      )}
                      {d.backupName && (
                        <div>
                          <div className="text-xs text-muted-foreground">Backup Name</div>
                          <div className="text-xs font-semibold text-foreground">{d.backupName}</div>
                        </div>
                      )}
                      {d.priority && (
                        <div>
                          <div className="text-xs text-muted-foreground">Priority</div>
                          <div className="text-xs font-semibold text-foreground">{d.priority}</div>
                        </div>
                      )}
                      {d.targetApprover && (
                        <div>
                          <div className="text-xs text-muted-foreground">Target Approver</div>
                          <div className="text-xs font-semibold text-foreground">{d.targetApprover}</div>
                        </div>
                      )}
                      {d.serverTag && (
                        <div>
                          <div className="text-xs text-muted-foreground">Tag</div>
                          <div className="text-xs font-semibold text-foreground">{d.serverTag}</div>
                        </div>
                      )}
                      {d.purpose && (
                        <div className="col-span-2 sm:col-span-3">
                          <div className="text-xs text-muted-foreground">Purpose</div>
                          <div className="text-xs text-foreground">{d.purpose}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
  const { approvals, submitApproval } = useApprovals();
  const [assets, setAssets] = useState(SEED_ASSETS);
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [auditAsset, setAuditAsset] = useState(null);

  const visible = useMemo(() => {
    return assets
      .filter((a) => typeFilter === 'All' || a.type === typeFilter)
      .filter((a) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        return (
          (a.id && a.id.toLowerCase().includes(q)) ||
          (a.model && a.model.toLowerCase().includes(q)) ||
          (a.assignedTo && a.assignedTo.toLowerCase().includes(q)) ||
          (a.department && a.department.toLowerCase().includes(q))
        );
      });
  }, [assets, typeFilter, searchQuery]);

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

  function handleRequestApproval(asset) {
    submitApproval({
      assetIdRef: asset.id,
      title: `Asset Approval — ${asset.model}`,
      sub: `${asset.id} · ${asset.assignedTo || 'IT Store'} (${asset.department})`,
      requestedBy: 'IT Desk',
      category: 'Hardware',
      priority: 'high',
      status: 'pending_founder',
    });

    setAssets((prev) =>
      prev.map((item) => (item.id === asset.id ? { ...item, approvalStatus: 'pending_founder' } : item))
    );

    toast.success(`Approval request sent to Founder for ${asset.id}`, {
      description: `${asset.model} — Added to Founder approval queue.`,
    });
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
        <div className="flex items-center gap-2.5">
          <ItDatePicker />
          <button
            type="button"
            onClick={openAddModal}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Asset</span>
          </button>
        </div>
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
        {/* Search Bar at the top */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by asset ID, model, user, or department…"
            aria-label="Search assets"
            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* Category Filters below Search Bar */}
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
          emptyMessage="No assets match your search or filter criteria."
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
              key: 'approval',
              label: 'Approval',
              sortable: false,
              width: '160px',
              render: (a) => {
                const matched = approvals.find(
                  (app) => app.assetIdRef === a.id || (app.sub && app.sub.includes(a.id)) || (app.title && app.title.includes(a.id))
                );

                const status = matched ? matched.status : (a.approvalStatus || 'none');

                if (status === 'approved') {
                  return (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold bg-emerald-500/10 text-emerald-500 border-emerald-500/20 whitespace-nowrap">
                      <CheckCircle2 size={12} /> Approved
                    </span>
                  );
                }

                if (status === 'rejected' || status === 'not_approved') {
                  return (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold bg-red-500/10 text-red-500 border-red-500/20 whitespace-nowrap">
                      <XCircle size={12} /> Not Approved
                    </span>
                  );
                }

                if (status === 'pending_founder' || status === 'pending') {
                  return (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold bg-amber-500/10 text-amber-500 border-amber-500/20 whitespace-nowrap">
                      <Clock size={12} /> Pending Approval
                    </span>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={() => handleRequestApproval(a)}
                    className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-3 py-1 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
                  >
                    Request Approval
                  </button>
                );
              },
            },
          ]}
        />
      </Card>

      {/* Asset Audit Sidebar */}
      <Drawer open={!!auditAsset} onClose={() => setAuditAsset(null)} title={auditAsset ? `Audit — ${auditAsset.id}` : 'Asset Audit'}>
        {auditAsset && (
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-sm font-semibold text-foreground">{auditAsset.model}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{auditAsset.assignedTo} · {auditAsset.department}</div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Cpu size={12} /> Component Inventory
              </h4>
              <div className="flex items-center gap-2 text-xs text-foreground mb-2">
                <HardDrive size={12} className="text-muted-foreground shrink-0" />
                <span>{auditAsset.hardDisk || 'No hard disk on record'}</span>
              </div>
              {auditAsset.componentsList?.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {auditAsset.componentsList.map((c, i) => (
                    <li key={i} className="text-xs text-muted-foreground pl-4 relative before:content-['·'] before:absolute before:left-0">{c}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No components on record.</p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Components Change Log</h4>
              {auditAsset.componentsLog?.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {auditAsset.componentsLog.map((entry, i) => (
                    <li key={i} className="text-xs bg-muted border border-border rounded-lg p-2.5">
                      <span className="text-muted-foreground">{entry.date}</span> — <span className="text-foreground">{entry.change}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No component changes logged.</p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Asset Allocation History</h4>
              {auditAsset.history?.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {auditAsset.history.map((entry, i) => (
                    <li key={i} className="text-xs bg-muted border border-border rounded-lg p-2.5">
                      <span className="text-muted-foreground">{entry.date}</span> — <span className="text-foreground">{entry.event}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No allocation history logged.</p>
              )}
            </div>
          </div>
        )}
      </Drawer>

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
        <div className="flex items-center gap-2.5">
          <ItDatePicker />
          <button
            type="button"
            onClick={exportCsv}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
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

// Read-only for IT — Production owns adding jobs and marking them complete
// (ProductionDashboardView), so this mirrors that same shared RenderContext
// list rather than giving IT its own editable copy of someone else's queue.
function RenderingStatusView() {
  const { renders, updateRenderField } = useRenders();
  const activeJobs = renders.filter((r) => r.status === 'Queue' || r.status === 'Pending').length;

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Rendering Status</h1>
          <p className="text-xs text-muted-foreground">Live view of the Production Floor render farm</p>
        </div>
        <ItDatePicker />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard icon={Film} label="Total Renders" value={renders.length} sub="jobs recorded" accent="hsl(var(--chart-1))" />
        <StatCard icon={Play} label="Active / Queue" value={activeJobs} sub="jobs in flight" accent="hsl(var(--chart-2))" />
        <StatCard icon={Clock} label="On Hold" value={renders.filter((r) => r.status === 'On Hold').length} sub="paused jobs" accent="hsl(var(--chart-3))" />
        <StatCard icon={CheckCircle2} label="Completed" value={renders.filter((r) => r.status === 'Completed').length} sub="jobs finished" accent="hsl(var(--chart-4))" />
      </div>

      <Card>
        <SectionHeader title="Render Queue" subtitle={`${renders.length} job${renders.length === 1 ? '' : 's'} on the farm`} />
        <DataTable
          rows={renders}
          pageSize={10}
          emptyMessage="No render jobs logged yet."
          columns={[
            {
              key: 'sno',
              label: 'S.No.',
              width: '60px',
              sortable: false,
              render: (_, index) => <span className="text-muted-foreground font-semibold text-xs">{(index ?? 0) + 1}</span>,
            },
            {
              key: 'date',
              label: 'Date',
              width: '100px',
              render: (r) => <span className="text-muted-foreground text-xs whitespace-nowrap">{r.date || '—'}</span>,
            },
            {
              key: 'sequence',
              label: 'Sequence',
              width: '170px',
              sortable: false,
              render: (r) => (
                <input
                  type="text"
                  value={r.sequence || ''}
                  onChange={(e) => updateRenderField && updateRenderField(r.id, 'sequence', e.target.value)}
                  placeholder="Type sequence..."
                  className="w-full bg-background border border-input rounded-md px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60"
                />
              ),
            },
            {
              key: 'frameNo',
              label: 'Frame No',
              width: '170px',
              sortable: false,
              render: (r) => (
                <input
                  type="text"
                  value={r.frameNo || ''}
                  onChange={(e) => updateRenderField && updateRenderField(r.id, 'frameNo', e.target.value)}
                  placeholder="Type frame no..."
                  className="w-full bg-background border border-input rounded-md px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60"
                />
              ),
            },
            {
              key: 'personName',
              label: 'Assigned To',
              width: '160px',
              render: (r) => (
                <select
                  value={r.personName || 'Unassigned'}
                  onChange={(e) => updateRenderField && updateRenderField(r.id, 'personName', e.target.value)}
                  aria-label={`Assigned employee for render job ${r.id}`}
                  className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  {['Sameer Kulkarni', 'Priya Nair', 'John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'Robert Brown', 'Unassigned'].map((emp) => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              ),
            },
            {
              key: 'endDate',
              label: 'End Date',
              width: '135px',
              sortable: false,
              render: (r) => (
                <input
                  type="date"
                  value={r.endDate || ''}
                  onChange={(e) => updateRenderField && updateRenderField(r.id, 'endDate', e.target.value)}
                  className="w-full bg-background border border-input rounded-md px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              ),
            },
            {
              key: 'status',
              label: 'Status',
              width: '140px',
              render: (r) => (
                <select
                  value={r.status || 'Queue'}
                  onChange={(e) => updateRenderField && updateRenderField(r.id, 'status', e.target.value)}
                  aria-label={`Status for render job ${r.id}`}
                  className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  {['Completed', 'Pending', 'On Hold', 'Queue'].map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  const { approvals, submitApproval } = useApprovals();
  const itPendingFounder = approvals.filter((a) => a.source === 'IT' && a.status === 'pending_founder').length;

  // Data Requests state
  const [dataRequests, setDataRequests] = useState([
    { id: 1, path: 'Server 70  →  Server 131', name: 'Project Data', status: 'In Progress' },
    { id: 2, path: 'Server 50  →  Server 70', name: 'Backup Files', status: 'Completed' },
    { id: 3, path: 'Server 29  →  Server 131', name: 'Client Records', status: 'Open' },
    { id: 4, path: 'Anima  →  Server 70', name: 'Media Files', status: 'In Progress' },
    { id: 5, path: 'Server 131  →  Anima', name: 'Reports', status: 'Waiting Approval' },
  ]);

  // Certain servers carry a standing rule about who signs off, or what tag
  // the request should always carry — set once here rather than left for
  // whoever fills the form to remember every time.
  function routingFor(server) {
    if (server === 'Server 100') return { approver: "Payel Ma'am (HR Manager)" };
    if (server === 'Server 121') return { approver: 'Rathish sir (Founder)' };
    if (server === 'Server 70') return { tag: 'Priority Wise' };
    if (server === 'Server 50') return { tag: 'Tag Every Time' };
    if (server === 'Server 131') return { tag: 'Standard Queue' };
    return {};
  }

  function handleNewDataRequest(req) {
    const rule = routingFor(req.source).approver || routingFor(req.source).tag
      ? routingFor(req.source)
      : routingFor(req.destination);
    const targetApprover = rule.approver || null;
    const serverTag = rule.tag || null;
    const status = targetApprover ? 'Waiting Approval' : req.status || 'Waiting Approval';

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

    if (targetApprover) {
      submitApproval({
        title: `Data Transfer Approval — ${req.folder || 'Data Copy'}`,
        sub: `${req.source} → ${req.destination} · Approver: ${targetApprover}`,
        requestedBy: req.requesterName || 'IT Desk',
        priority: req.priority === 'Critical' ? 'high' : (req.priority || 'medium').toLowerCase(),
        category: 'Data Transfer',
      });
    }

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
  const { tickets: recentTickets, changeStatus: changeTicketStatus, updateTicketField } = useTickets();

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
            <ItDatePicker />
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
        <TicketsQueueView
          tickets={recentTickets}
          onStatusChange={changeTicketStatusWithUndo}
          onFieldChange={updateTicketField}
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
