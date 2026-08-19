import { useState } from 'react';
import { toast } from 'sonner';
import { useApprovals } from '../context/ApprovalContext';
import ItDatePicker from './ItDatePicker';
import { Card, SectionHeader } from './ui';
import { DateField } from './ui/date-field';
import { Search, X } from 'lucide-react';

const APPROVAL_CATEGORIES_BY_SOURCE = {
  IT: ['General', 'Software', 'Hardware', 'System Access', 'Data Transfer'],
  HR: ['General', 'Leave', 'Payroll', 'Recruitment', 'Employee Relations', 'Policy Exception', 'Onboarding', 'Offboarding'],
};
const DEPARTMENT_OPTIONS_BY_SOURCE = {
  IT: ['IT Support', 'Engineering', 'Network', 'Software', 'VPN', 'Data Team', 'Design', 'HR', 'Finance'],
  HR: ['HR', 'Engineering', 'Sales', 'Marketing', 'Branding', 'Production', 'Finance', 'Operations'],
};

function emptyForm(defaultDepartment) {
  return {
    date: new Date().toISOString().slice(0, 10),
    title: '',
    department: defaultDepartment,
    sub: '',
    employeeId: '',
    username: '',
    requestedBy: '',
    priority: 'medium',
    category: 'General',
  };
}

// Numbers the "Send for Founder Approval" fields 1-8 in fill order, so the
// form reads top-to-bottom / left-to-right the same way the numbered
// comments beside each field already document it.
function FieldLabel({ n, text }) {
  return (
    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
      <span className="shrink-0 w-3.5 h-3.5 rounded-full bg-muted-foreground/15 text-[9px] font-bold text-muted-foreground flex items-center justify-center">
        {n}
      </span>
      {text}
    </span>
  );
}

// Shared by every desk's own Approval Center (IT's DashboardPage, HR's
// pages/hr/Approvals.jsx) — `source` is the only thing that changes what
// shows up here vs. in the Founder's Approval Center, which splits its
// panels by approvals/{id}.source ('IT' vs 'HR').
export default function ApprovalCenterView({ source = 'IT', defaultDepartment = source === 'HR' ? 'HR' : 'IT Support', defaultRequestedByLabel = source === 'HR' ? 'HR Desk' : 'IT Support' }) {
  const { approvals, submitApproval, hasMoreApprovals, loadMoreApprovals, loadingMore } = useApprovals();
  const approvalCategories = APPROVAL_CATEGORIES_BY_SOURCE[source] || APPROVAL_CATEGORIES_BY_SOURCE.IT;
  const departmentOptions = DEPARTMENT_OPTIONS_BY_SOURCE[source] || DEPARTMENT_OPTIONS_BY_SOURCE.IT;
  const [form, setForm] = useState(() => emptyForm(defaultDepartment));
  const [sortOrder, setSortOrder] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const deskApprovals = approvals.filter((a) => a.source === source);
  const categories = ['All', ...new Set(deskApprovals.map((a) => a.category || 'General'))];

  const filtered = deskApprovals
    .filter((a) => priorityFilter === 'All' || a.priority === priorityFilter.toLowerCase())
    .filter((a) => categoryFilter === 'All' || (a.category || 'General') === categoryFilter)
    .filter((a) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        (a.id && String(a.id).toLowerCase().includes(q)) ||
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.sub && a.sub.toLowerCase().includes(q)) ||
        (a.requestedBy && a.requestedBy.toLowerCase().includes(q)) ||
        (a.department && a.department.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q)) ||
        (a.priority && a.priority.toLowerCase().includes(q)) ||
        (a.status && a.status.toLowerCase().includes(q)) ||
        (a.timestamp && a.timestamp.toLowerCase().includes(q)) ||
        (a.date && a.date.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => (sortOrder === 'newest' ? (b.createdAt || 0) - (a.createdAt || 0) : (a.createdAt || 0) - (b.createdAt || 0)));

  const pendingFounder = statusFilter === 'Resolved' ? [] : filtered.filter((a) => a.status === 'pending_founder');
  const decided = statusFilter === 'Pending' ? [] : filtered.filter((a) => a.status !== 'pending_founder');

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Give the request a title', {
        description: 'The founder needs to know what they are approving.',
      });
      return;
    }
    try {
      await submitApproval({
        ...form,
        requestedBy: form.username || form.employeeId || defaultRequestedByLabel,
        source,
      });
    } catch (err) {
      toast.error('Could not send for approval', { description: err.response?.data?.error || err.message });
      return;
    }
    setForm(emptyForm(defaultDepartment));
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

      {/* Form on the left, Awaiting Founder Sign-off list on the right —
          side by side instead of stacked, so the form can stay compact.
          Both cards stretch to the row's tallest so the shorter one (usually
          the list, especially when empty) doesn't leave a half-filled box
          next to a full one. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <Card>
          <h3 className="font-semibold text-sm text-foreground mb-3">Send for Founder Approval</h3>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Date */}
            <DateField
              label={<FieldLabel n={1} text="Date" />}
              value={form.date || new Date().toISOString().slice(0, 10)}
              onChange={(dateStr) => setForm((f) => ({ ...f, date: dateStr }))}
            />

            {/* 2. Request Title */}
            <div className="flex flex-col gap-1">
              <FieldLabel n={2} text="Request Title" />
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
              <FieldLabel n={3} text="Department" />
              <select
                value={form.department || defaultDepartment}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                aria-label="Department"
                className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                {departmentOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* 4. Details */}
            <div className="flex flex-col gap-1">
              <FieldLabel n={4} text="Details" />
              <input
                value={form.sub}
                onChange={(e) => setForm((f) => ({ ...f, sub: e.target.value }))}
                placeholder="Details"
                className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* 5. Employee ID */}
            <div className="flex flex-col gap-1">
              <FieldLabel n={5} text="Employee ID" />
              <input
                value={form.employeeId}
                onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                placeholder="Employee ID (e.g. EMP-2001)"
                className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* 6. Username */}
            <div className="flex flex-col gap-1">
              <FieldLabel n={6} text="Username" />
              <input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="Username (e.g. john.doe)"
                className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* 7. Category */}
            <div className="flex flex-col gap-1">
              <FieldLabel n={7} text="Category" />
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                aria-label="Category"
                className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                {approvalCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* 8. Priority */}
            <div className="flex flex-col gap-1">
              <FieldLabel n={8} text="Priority" />
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
              className="sm:col-span-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer mt-1"
            >
              Send for Founder Approval
            </button>
          </form>
        </Card>

        <Card className="flex flex-col">
          <SectionHeader title="Awaiting Founder Sign-off" subtitle={`${pendingFounder.length} pending`} />
          {pendingFounder.length === 0 ? (
            <p className="flex-1 flex items-center justify-center text-xs text-muted-foreground py-4">Nothing matches these filters.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingFounder.map((app, i) => (
                <div key={app.id} className="p-3.5 rounded-lg bg-muted border border-border flex items-center gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-background border border-border text-[10px] font-bold text-muted-foreground flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="min-w-0 pr-2 flex-1">
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
        </Card>
      </div>

      <Card>
        <SectionHeader title="Decision History" subtitle={`${decided.length} decided`} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, requester, department, category, priority..."
              aria-label="Search approvals"
              className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
        </div>

        {decided.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">Nothing matches these filters.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {decided.map((app, i) => (
              <div key={app.id} className="p-3.5 rounded-lg bg-muted border border-border flex items-center gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-background border border-border text-[10px] font-bold text-muted-foreground flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="min-w-0 pr-2 flex-1">
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
      </Card>

      {hasMoreApprovals && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMoreApprovals}
            disabled={loadingMore}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
