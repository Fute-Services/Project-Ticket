import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { useTaskProject } from '../context/TaskProjectContext';
import ItDeskLayout from '../components/ItDeskLayout';
import NewItTicketModal from '../components/NewItTicketModal';
import NewHrTicketModal from '../components/NewHrTicketModal';
import DataTable from '../components/DataTable';
import { Card, SectionHeader, StatCard, Badge } from '../components/ui';
import { Plus, UserPlus, Search, X } from 'lucide-react';
import TaskRow from '../components/tasks/TaskRow';
import TaskDetailPane from '../components/tasks/TaskDetailPane';
import { toast } from 'sonner';

const TICKET_STATUS_BADGE = {
  Open: 'bg-primary/10 text-primary border-primary/20',
  'In Progress': 'bg-muted/10 text-muted-foreground border-muted/20',
  'Waiting Approval': 'bg-warning/10 text-warning border-warning/20',
  Resolved: 'bg-primary/10 text-primary border-primary/20',
  Closed: 'bg-muted/10 text-muted-foreground border-muted/20',
};

const TICKET_STATUSES = ['Open', 'In Progress', 'Waiting Approval', 'Resolved', 'Closed'];

function MyTicketsView({ tickets, onFieldChange, onNewTicket, onNewHrTicket }) {
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const visible = useMemo(() => {
    return tickets
      .filter((t) => (filter === 'All' ? true : t.status === filter))
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (t.token && t.token.toLowerCase().includes(q)) ||
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.dept && t.dept.toLowerCase().includes(q)) ||
          (t.user && t.user.toLowerCase().includes(q)) ||
          (t.username && t.username.toLowerCase().includes(q)) ||
          (t.employeeId && t.employeeId.toLowerCase().includes(q)) ||
          (t.vpnNo && t.vpnNo.toLowerCase().includes(q)) ||
          (t.status && t.status.toLowerCase().includes(q)) ||
          (t.solver && t.solver.toLowerCase().includes(q)) ||
          (t.employeeStatus && t.employeeStatus.toLowerCase().includes(q)) ||
          (t.remarks && t.remarks.toLowerCase().includes(q)) ||
          (t.date && t.date.toLowerCase().includes(q))
        );
      });
  }, [tickets, filter, searchQuery]);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">My Tickets Queue</h1>
          <p className="text-xs text-muted-foreground">{tickets.length} tickets raised by you</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewTicket}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Raise IT Ticket</span>
          </button>
          <button
            type="button"
            onClick={onNewHrTicket}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            <UserPlus size={16} />
            <span>Raise HR Ticket</span>
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket token, issue, dept, status, remarks..."
              aria-label="Search my tickets"
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

          {/* Filter Status Buttons */}
          <div className="flex flex-wrap gap-1.5">
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
        </div>

        <DataTable
          rows={visible}
          pageSize={10}
          emptyMessage={
            searchQuery
              ? `No tickets found matching "${searchQuery}".`
              : filter === 'All'
              ? 'You have not raised any tickets yet.'
              : `No tickets are currently ${filter.toLowerCase()}.`
          }
          columns={[
            {
              key: 'sno',
              label: 'S.No.',
              width: '45px',
              sortable: false,
              render: (_, index) => <span className="text-muted-foreground font-semibold text-xs">{(index ?? 0) + 1}</span>,
            },
            {
              key: 'token',
              label: 'Token',
              width: '85px',
              render: (t) => <span className="font-bold text-primary text-xs">{t.token}</span>,
            },
            {
              key: 'date',
              label: 'Date',
              width: '80px',
              render: (t) => <span className="text-muted-foreground text-xs whitespace-nowrap">{t.date || '—'}</span>,
            },
            {
              key: 'username',
              label: 'Username',
              width: '90px',
              render: (t) => <span className="text-foreground font-medium text-xs truncate block">{t.username || t.user || '—'}</span>,
            },
            {
              key: 'employeeId',
              label: 'Employee ID',
              width: '90px',
              render: (t) => <span className="font-semibold text-primary text-xs">{t.employeeId || '—'}</span>,
            },
            {
              key: 'vpnNo',
              label: 'VPN ID',
              width: '80px',
              render: (t) => <span className="text-muted-foreground font-mono text-[11px]">{t.vpnNo || '—'}</span>,
            },
            {
              key: 'dept',
              label: 'Department',
              width: '85px',
              render: (t) => <span className="text-muted-foreground text-xs truncate block">{t.dept || '—'}</span>,
            },
            {
              key: 'title',
              label: 'Issue',
              width: '150px',
              render: (t) => <span className="text-foreground text-xs font-medium block truncate" title={t.title}>{t.title}</span>,
            },
            {
              key: 'status',
              label: 'IT Dept Status',
              width: '120px',
              render: (t) => (
                <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full border font-semibold whitespace-nowrap ${TICKET_STATUS_BADGE[t.status] || 'bg-muted text-muted-foreground border-border'}`}>
                  {t.status}
                </span>
              ),
            },
            {
              key: 'employeeStatus',
              label: 'Employee Status',
              width: '125px',
              render: (t) => (
                <select
                  value={t.employeeStatus || 'Active'}
                  onChange={(e) => {
                    onFieldChange && onFieldChange(t.id, 'employeeStatus', e.target.value);
                    toast.success(`Employee Status updated to "${e.target.value}"`, {
                      description: `Reflected in IT Dashboard for ticket ${t.token || t.id}`,
                    });
                  }}
                  aria-label={`Employee status for ticket ${t.token}`}
                  className="w-full bg-primary/10 border border-primary/30 text-primary font-semibold rounded-lg px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  {['Active', 'Pending', 'Satisfied', 'Closed'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ),
            },
            {
              key: 'solver',
              label: 'Resolved By',
              width: '100px',
              render: (t) => <span className="text-muted-foreground font-medium text-xs">{t.solver || 'Team 1'}</span>,
            },
            {
              key: 'remarks',
              label: 'Remarks',
              sortable: false,
              width: '140px',
              render: (t) => (
                <div className="truncate max-w-[150px]" title={t.remarks || 'No remarks yet'}>
                  {t.remarks ? (
                    <span className="text-xs text-foreground font-medium bg-muted px-2 py-0.5 rounded border border-border inline-block max-w-full truncate">
                      💬 {t.remarks}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50 italic">No remarks</span>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

const TODAY = '2026-08-06';

function MyTasksView({ tasks, projects, onToggle, onOpen }) {
  // Asana's My Tasks groups by when something is due, not by status — the
  // question a person opens this page to answer is "what do I do now".
  // Overdue is folded into Today so it can't be scrolled past.
  const buckets = useMemo(() => {
    const open = tasks.filter((t) => t.status !== 'Completed');
    const done = tasks.filter((t) => t.status === 'Completed');
    const byDate = (a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || ''));

    const overdueOrToday = open.filter((t) => t.dueDate && t.dueDate <= TODAY).sort(byDate);
    const upcoming = open.filter((t) => t.dueDate && t.dueDate > TODAY).sort(byDate);
    const undated = open.filter((t) => !t.dueDate);

    return [
      { label: 'Today & overdue', items: overdueOrToday },
      { label: 'Upcoming', items: upcoming },
      { label: 'No due date', items: undated },
      { label: 'Completed', items: done },
    ];
  }, [tasks]);

  const openCount = tasks.filter((t) => t.status !== 'Completed').length;

  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight mb-1">My Tasks &amp; Projects</h1>
        <p className="text-xs text-muted-foreground">
          {openCount} open · {projects.length} project{projects.length === 1 ? '' : 's'} you're on
        </p>
      </div>

      <Card>
        <SectionHeader title="My Projects" />
        {projects.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">You're not on any active projects yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projects.map((p) => (
              <div key={p.id} className="p-3.5 rounded-lg bg-muted border border-border">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-foreground truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.progress}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                </div>
                <div className="text-xs text-muted-foreground">{p.client} · due {p.dueDate}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">My Tasks</h2>
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            Nothing assigned to you yet. Tasks your coordinator assigns will appear here.
          </p>
        ) : (
          buckets.map(({ label, items }) =>
            items.length === 0 ? null : (
              <section key={label}>
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b border-border">
                  <h3 className="text-xs font-medium text-foreground">{label}</h3>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                {items.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    project={projects.find((p) => p.id === t.projectId)}
                    onToggle={onToggle}
                    onOpen={onOpen}
                  />
                ))}
              </section>
            )
          )
        )}
      </div>
    </div>
  );
}

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const { tickets, addTicket, updateTicketField } = useTickets();
  const { tasks, projects, toggleComplete } = useTaskProject();
  const [openTaskId, setOpenTaskId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isHrTicketModalOpen, setIsHrTicketModalOpen] = useState(false);

  // Every employee shares the same underlying ticket list as IT's queue —
  // scope the view to tickets this person raised.
  const myTickets = useMemo(
    () => tickets.filter((t) => t.user === (user?.full_name || 'You')),
    [tickets, user]
  );

  // Tasks/projects come from the same shared context the Coordinator
  // assigns from — scope to this employee by name.
  const myTasks = useMemo(
    () => tasks.filter((t) => t.assignee === user?.full_name),
    [tasks, user]
  );
  const myProjects = useMemo(
    () => projects.filter((p) => p.members.includes(user?.full_name)),
    [projects, user]
  );

  // Resolve by id each render so the pane reflects edits instead of showing
  // a stale snapshot of the task.
  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) : null;

  const myProjectChannels = useMemo(
    () => myProjects.map((p) => ({ id: `project-${p.id}`, name: p.name, desc: `${p.members.length} members + coordinator` })),
    [myProjects]
  );

  function handleNewTicket(req) {
    addTicket(req, user?.full_name);
    toast.success('IT Ticket raised', {
      description: "IT can see it now — you'll find it under My Tickets.",
    });
  }

  function handleNewHrTicket(req) {
    addTicket(
      {
        ...req,
        dept: 'HR',
      },
      user?.full_name
    );
    toast.success('HR Ticket raised', {
      description: req.isConfidential
        ? 'Routed confidentially to Senior HR & Founder.'
        : 'HR team has been notified — track it under My Tickets.',
    });
  }

  function completeWithUndo(id) {
    const before = tasks.find((t) => t.id === id);
    toggleComplete(id);
    toast.success(before?.status !== 'Completed' ? 'Task completed' : 'Marked incomplete', {
      description: before?.title,
      action: { label: 'Undo', onClick: () => toggleComplete(id) },
    });
  }

  const searchIndex = useMemo(
    () => myTickets.map((t) => ({ group: 'Tickets', label: `${t.token} — ${t.title}`, sub: `${t.dept} · ${t.status}`, tab: 'tickets' })),
    [myTickets]
  );

  return (
    <ItDeskLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      searchIndex={searchIndex}
      role="employee"
      projectChannels={myProjectChannels}
    >
      {activeTab === 'dashboard' && (
        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1">
                Welcome, {user?.full_name || 'there'}
              </h1>
              <p className="text-xs text-muted-foreground">Raise IT or HR issues and track them through to resolution.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTicketModalOpen(true)}
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>Raise IT Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => setIsHrTicketModalOpen(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                <UserPlus size={15} />
                <span>Raise HR Ticket</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Total Tickets" value={myTickets.length} sub="raised by you" />
            <StatCard
              label="In Progress"
              value={myTickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length}
              sub="being worked"
            />
            <StatCard
              label="Resolved"
              value={myTickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length}
              sub="completed"
            />
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-foreground">Recent Tickets Queue</h3>
              <button
                type="button"
                onClick={() => setActiveTab('tickets')}
                className="text-xs text-primary font-semibold hover:underline cursor-pointer"
              >
                View All Tickets Queue →
              </button>
            </div>
            <DataTable
              rows={myTickets.slice(0, 5)}
              pageSize={5}
              emptyMessage="No tickets raised yet. Click 'Raise IT Ticket' to submit an issue."
              columns={[
                {
                  key: 'sno',
                  label: 'S.No.',
                  width: '45px',
                  sortable: false,
                  render: (_, index) => <span className="text-muted-foreground font-semibold text-xs">{(index ?? 0) + 1}</span>,
                },
                {
                  key: 'token',
                  label: 'Token',
                  width: '85px',
                  render: (t) => <span className="font-bold text-primary text-xs">{t.token}</span>,
                },
                {
                  key: 'date',
                  label: 'Date',
                  width: '80px',
                  render: (t) => <span className="text-muted-foreground text-xs whitespace-nowrap">{t.date || '—'}</span>,
                },
                {
                  key: 'username',
                  label: 'Username',
                  width: '90px',
                  render: (t) => <span className="text-foreground font-medium text-xs truncate block">{t.username || t.user || '—'}</span>,
                },
                {
                  key: 'employeeId',
                  label: 'Employee ID',
                  width: '90px',
                  render: (t) => <span className="font-semibold text-primary text-xs">{t.employeeId || '—'}</span>,
                },
                {
                  key: 'vpnNo',
                  label: 'VPN ID',
                  width: '80px',
                  render: (t) => <span className="text-muted-foreground font-mono text-[11px]">{t.vpnNo || '—'}</span>,
                },
                {
                  key: 'dept',
                  label: 'Department',
                  width: '85px',
                  render: (t) => <span className="text-muted-foreground text-xs truncate block">{t.dept || '—'}</span>,
                },
                {
                  key: 'title',
                  label: 'Issue',
                  width: '150px',
                  render: (t) => <span className="text-foreground text-xs font-medium block truncate" title={t.title}>{t.title}</span>,
                },
                {
                  key: 'status',
                  label: 'IT Dept Status',
                  width: '120px',
                  render: (t) => (
                    <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full border font-semibold whitespace-nowrap ${TICKET_STATUS_BADGE[t.status] || 'bg-muted text-muted-foreground border-border'}`}>
                      {t.status}
                    </span>
                  ),
                },
                {
                  key: 'employeeStatus',
                  label: 'Employee Status',
                  width: '125px',
                  render: (t) => (
                    <select
                      value={t.employeeStatus || 'Active'}
                      onChange={(e) => {
                        updateTicketField(t.id, 'employeeStatus', e.target.value);
                        toast.success(`Employee Status updated to "${e.target.value}"`);
                      }}
                      aria-label={`Employee status for ticket ${t.token}`}
                      className="w-full bg-primary/10 border border-primary/30 text-primary font-semibold rounded-lg px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      {['Active', 'Pending', 'Satisfied', 'Closed'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ),
                },
                {
                  key: 'solver',
                  label: 'Resolved By',
                  width: '100px',
                  render: (t) => <span className="text-muted-foreground font-medium text-xs">{t.solver || 'Team 1'}</span>,
                },
                {
                  key: 'remarks',
                  label: 'Remarks',
                  sortable: false,
                  width: '140px',
                  render: (t) => (
                    <div className="truncate max-w-[150px]" title={t.remarks || 'No remarks yet'}>
                      {t.remarks ? (
                        <span className="text-xs text-foreground font-medium bg-muted px-2 py-0.5 rounded border border-border inline-block max-w-full truncate">
                          💬 {t.remarks}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 italic">No remarks</span>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <MyTicketsView
          tickets={myTickets}
          onFieldChange={updateTicketField}
          onNewTicket={() => setIsTicketModalOpen(true)}
          onNewHrTicket={() => setIsHrTicketModalOpen(true)}
        />
      )}

      {activeTab === 'tasks' && (
        <MyTasksView
          tasks={myTasks}
          projects={myProjects}
          onToggle={completeWithUndo}
          onOpen={(t) => setOpenTaskId(t.id)}
        />
      )}

      {/* Read-only: an employee can complete their own work, but reassigning
          it or changing its priority is the coordinator's call. */}
      <TaskDetailPane
        task={openTask}
        project={openTask ? projects.find((p) => p.id === openTask.projectId) : null}
        open={!!openTask}
        onClose={() => setOpenTaskId(null)}
        onToggle={completeWithUndo}
        readOnly
      />

      <NewItTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onSubmitSuccess={handleNewTicket}
      />

      <NewHrTicketModal
        isOpen={isHrTicketModalOpen}
        onClose={() => setIsHrTicketModalOpen(false)}
        onSubmitSuccess={handleNewHrTicket}
      />
    </ItDeskLayout>
  );
}
