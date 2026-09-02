import { useState } from 'react';
import { toast } from 'sonner';
import { useApprovals } from '../context/ApprovalContext';
import ItDatePicker from './ItDatePicker';
import { Card, SectionHeader } from './ui';
import { DateField } from './ui/date-field';
import { Search, X } from 'lucide-react';
import { ColorSelect } from './TicketsQueueView';

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
// pages/hr/Approvals.jsx) - `source` is the only thing that changes what
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

      {/* Form on the left, Awaiting Founder Sign-off list on the right -
          side by side instead of stacked, so the form can stay compact.
          Both cards stretch to the row's tallest so the shorter one (usually
          the list, especially when empty) doesn't leave a half-filled box
          next to a full one. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <Card className="relative z-20 overflow-visible">
          <h3 className="font-semibold text-sm text-foreground mb-3">Send for Founder Approval</h3>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-visible">
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
                className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* 3. Department */}
            <div className="flex flex-col gap-1">
              <FieldLabel n={3} text="Department" />
              <ColorSelect
                value={form.department || defaultDepartment}
                onChange={(val) => setForm((f) => ({ ...f, department: val }))}
                options={departmentOptions}
                ariaLabel="Department"
              />
            </div>

            {/* 4. Details */}
            <div className="flex flex-col gap-1">
              <FieldLabel n={4} text="Details" />
              <input
                value={form.sub}
                onChange={(e) => setForm((f) => ({ ...f, sub: e.target.value }))}
                placeholder="Details"
                className="bg-white/70 backdrop-blur-md border border-white/85 rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground hover:bg-white/85 focus-visible:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 shadow-sm transition-all"
              />
            </div>

            {/* 5. Employee ID */}
            <div className="flex flex-col gap-1">
              <FieldLabel n={5} text="Employee ID" />
              <input
                value={form.employeeId}
                onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                placeholder="Employee ID (e.g. EMP-2001)"
                className="bg-white/70 backdrop-blur-md border border-white/85 rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground hover:bg-white/85 focus-visible:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 shadow-sm transition-all"
              />
            </div>

            {/* 6. Username */}
            <div className="flex flex-col gap-1">
              <FieldLabel n={6} text="Username" />
              <input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="Username (e.g. john.doe)"
                className="bg-white/70 backdrop-blur-md border border-white/85 rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground hover:bg-white/85 focus-visible:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 shadow-sm transition-all"
              />
            </div>

            {/* 7. Category */}
            <div className="flex flex-col gap-1">
              <FieldLabel n={7} text="Category" />
              <ColorSelect
                value={form.category}
                onChange={(val) => setForm((f) => ({ ...f, category: val }))}
                options={approvalCategories}
                ariaLabel="Category"
              />
            </div>

            {/* 8. Priority */}
            <div className="flex flex-col gap-1">
              <FieldLabel n={8} text="Priority" />
              <ColorSelect
                value={form.priority}
                onChange={(val) => setForm((f) => ({ ...f, priority: val }))}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ]}
                ariaLabel="Priority"
              />
            </div>

            <button
              type="submit"
              className="sm:col-span-2 bg-primary hover:bg-primary-hover active:scale-[0.98] text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer mt-1"
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
            <div className="w-44">
              <ColorSelect
                value={sortOrder}
                onChange={setSortOrder}
                ariaLabel="Sort order"
                options={[
                  { value: 'newest', label: 'Datewise: Newest first' },
                  { value: 'oldest', label: 'Datewise: Oldest first' },
                ]}
              />
            </div>
            <div className="w-32">
              <ColorSelect
                value={statusFilter}
                onChange={setStatusFilter}
                ariaLabel="Status filter"
                options={[
                  { value: 'All', label: 'All statuses' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Resolved', label: 'Resolved' },
                ]}
              />
            </div>
            <div className="w-32">
              <ColorSelect
                value={priorityFilter}
                onChange={setPriorityFilter}
                ariaLabel="Priority filter"
                options={[
                  { value: 'All', label: 'All priorities' },
                  { value: 'High', label: 'High' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'Low', label: 'Low' },
                ]}
              />
            </div>
            <div className="w-36">
              <ColorSelect
                value={categoryFilter}
                onChange={setCategoryFilter}
                ariaLabel="Category filter"
                options={categories.map((c) => ({ value: c, label: c === 'All' ? 'All categories' : c }))}
              />
            </div>
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
