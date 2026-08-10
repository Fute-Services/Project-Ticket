import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { useTaskProject } from '../context/TaskProjectContext';
import ItDeskLayout from '../components/ItDeskLayout';
import NewItTicketModal from '../components/NewItTicketModal';
import NewHrTicketModal from '../components/NewHrTicketModal';
import { Card, SectionHeader, StatCard, Badge } from '../components/ui';
import { Plus, UserPlus } from 'lucide-react';
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

function MyTicketsView({ tickets, onNewTicket, onNewHrTicket }) {
  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">My Tickets</h1>
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
        {tickets.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">
            You haven't raised any tickets yet. Click "Raise Ticket" to submit an issue to IT.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-xs tracking-wider">
                  <th className="py-3 px-3">Token</th>
                  <th className="py-3 px-3">Issue</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-accent">
                    <td className="py-3.5 px-3 font-bold text-primary">{t.token}</td>
                    <td className="py-3.5 px-3 text-foreground">{t.title}</td>
                    <td className="py-3.5 px-3 text-muted-foreground">{t.dept}</td>
                    <td className="py-3.5 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap ${TICKET_STATUS_BADGE[t.status]}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
  const { tickets, addTicket } = useTickets();
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
            <h3 className="font-semibold text-sm text-foreground mb-4">Recent Tickets</h3>
            {myTickets.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">
                Nothing here yet — raise a ticket and it'll show up in the IT queue right away.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {myTickets.slice(0, 5).map((t) => (
                  <div key={t.id} className="p-3 rounded-lg bg-muted border border-border flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-foreground truncate">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.token} · {t.dept}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold shrink-0 ${TICKET_STATUS_BADGE[t.status]}`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <MyTicketsView
          tickets={myTickets}
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
