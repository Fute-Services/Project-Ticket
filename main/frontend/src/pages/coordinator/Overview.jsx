import { useNavigate } from 'react-router-dom';
import {
  ListChecks,
  Clock3,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  FolderKanban,
  Figma,
  Github,
} from 'lucide-react';
import CoordinatorLayout from '../../components/coordinator/CoordinatorLayout';
import { Card, SectionHeader, StatCard, Badge } from '../../components/ui';
import DonutChart from '../../components/DonutChart';
import { TASK_STATUSES } from '../../data/coordinatorMockData';
import { useTaskProject } from '../../context/TaskProjectContext';

const TODAY = '2026-08-06';

const STATUS_COLOR = { Pending: 'hsl(var(--chart-1))', 'In Progress': 'hsl(var(--chart-2))', Completed: 'hsl(var(--chart-3))' };

const PROJECT_STATUS_TONE = {
  'On Track': 'bg-primary/10 text-primary border-primary/20',
  'At Risk': 'bg-warning/10 text-warning border-warning/20',
  Delayed: 'bg-destructive/10 text-destructive border-destructive/20',
  Completed: 'bg-muted/10 text-muted-foreground border-muted/20',
};

const PROGRESS_BAR = {
  'On Track': 'from-primary to-primary',
  'At Risk': 'from-warning to-warning',
  Delayed: 'from-destructive to-destructive',
  Completed: 'from-muted to-muted',
};

// Members render as overlapping initial-avatars; two letters keeps
// "Yogesh Kumar" → "YK" readable at 24px.
function initials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function toDonutData(rows, key, statuses, colorMap) {
  const total = rows.length || 1;
  return statuses
    .map((label) => {
      const value = rows.filter((r) => r[key] === label).length;
      return { label, value, percent: Math.round((value / total) * 100), color: colorMap[label] };
    })
    .filter((s) => s.value > 0);
}

export default function CoordinatorOverview() {
  const navigate = useNavigate();
  const { tasks, projects } = useTaskProject();

  const pending = tasks.filter((t) => t.status === 'Pending').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const overdue = tasks.filter((t) => t.status !== 'Completed' && t.dueDate < TODAY).length;
  const activeProjects = projects.filter((p) => p.status !== 'Completed').length;

  const statusBreakdown = toDonutData(tasks, 'status', TASK_STATUSES, STATUS_COLOR);

  const byAssignee = Object.entries(
    tasks.reduce((acc, t) => {
      acc[t.assignee] = (acc[t.assignee] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const maxAssigned = Math.max(...byAssignee.map(([, c]) => c), 1);

  const dueSoon = [...tasks]
    .filter((t) => t.status !== 'Completed')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  return (
    <CoordinatorLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">
              Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">
              {activeProjects} active projects · {tasks.length} tasks · {overdue} overdue
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/coordinator/tasks')}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Assign Task</span>
          </button>
        </div>

        {/* Key Stat Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <StatCard icon={FolderKanban} label="Active Projects" value={activeProjects} accent="#A76C76" />
          <StatCard icon={ListChecks} label="Total Tasks" value={tasks.length} accent="#671421" />
          <StatCard icon={Clock3} label="Pending" value={pending} accent="#6E5F61" />
          <StatCard icon={Loader2} label="In Progress" value={inProgress} accent="#8B182C" />
          <StatCard icon={CheckCircle2} label="Completed" value={completed} accent="#360C13" />
          <StatCard icon={AlertTriangle} label="Overdue" value={overdue} accent="#ef4444" />
        </div>

        {/* Active Projects */}
        <Card>
          <SectionHeader
            title="Active Projects"
            subtitle="Progress, team, and linked design/code assets"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map((p) => {
              const projectTasks = tasks.filter((t) => t.projectId === p.id);
              const done = projectTasks.filter((t) => t.status === 'Completed').length;
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/coordinator/projects/${p.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/coordinator/projects/${p.id}`)}
                  className="p-4 rounded-lg bg-muted border border-border hover:border-muted-foreground/40 transition-colors flex flex-col gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-foreground truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.client} · due {p.dueDate}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap shrink-0 ${PROJECT_STATUS_TONE[p.status]}`}>
                      {p.status}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">{done}/{projectTasks.length} tasks done</span>
                      <span className="font-bold text-foreground">{p.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${PROGRESS_BAR[p.status]} rounded-full transition-all`}
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {/* Team member avatars */}
                    <div className="flex items-center -space-x-1.5">
                      {p.members.map((m) => (
                        <span
                          key={m}
                          title={m}
                          className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 ring-2 ring-muted flex items-center justify-center text-xs font-bold text-primary"
                        >
                          {initials(m)}
                        </span>
                      ))}
                      <span className="pl-3 text-xs text-muted-foreground">{p.members.length} members</span>
                    </div>

                    {/* Linked assets */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.figma && (
                        <a
                          href={`https://${p.figma}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={p.figma}
                          onClick={(e) => e.stopPropagation()}
                          className="w-6 h-6 rounded-lg bg-card border border-border hover:border-primary/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Figma size={12} />
                        </a>
                      )}
                      {p.repo && (
                        <a
                          href={`https://${p.repo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={p.repo}
                          onClick={(e) => e.stopPropagation()}
                          className="w-6 h-6 rounded-lg bg-card border border-border hover:border-primary/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Github size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Status breakdown + workload by assignee */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DonutChart title="Tasks by Status" total={tasks.length} data={statusBreakdown} />

          <Card>
            <SectionHeader title="Workload by Assignee" />
            <div className="flex flex-col gap-3">
              {byAssignee.map(([name, count]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">{name}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-warning rounded-full"
                      style={{ width: `${(count / maxAssigned) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground w-5 text-right shrink-0">{count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Due soon */}
        <Card>
          <SectionHeader
            title="Due Soon"
            subtitle="Open tasks sorted by due date"
            action={
              <button type="button" onClick={() => navigate('/coordinator/tasks')} className="text-xs text-primary font-semibold hover:underline cursor-pointer">
                View all
              </button>
            }
          />
          {dueSoon.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nothing open.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {dueSoon.map((t) => (
                <div key={t.id} className="p-3 rounded-lg bg-muted border border-border flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-foreground truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.assignee}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold ${t.dueDate < TODAY ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {t.dueDate < TODAY ? `Overdue · ${t.dueDate}` : t.dueDate}
                    </span>
                    <Badge value={t.priority} />
                    <Badge value={t.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </CoordinatorLayout>
  );
}
