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

const STATUS_COLOR = { Pending: '#f97316', 'In Progress': '#3b82f6', Completed: '#10b981' };

const PROJECT_STATUS_TONE = {
  'On Track': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'At Risk': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Delayed: 'bg-red-500/10 text-red-400 border-red-500/20',
  Completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const PROGRESS_BAR = {
  'On Track': 'from-emerald-500 to-emerald-400',
  'At Risk': 'from-amber-500 to-amber-400',
  Delayed: 'from-red-500 to-red-400',
  Completed: 'from-blue-500 to-blue-400',
};

// Members render as overlapping initial-avatars; two letters keeps
// "Priya Nair" → "PN" readable at 24px.
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
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1.5">
              Dashboard
            </h1>
            <p className="text-xs text-gray-400">
              {activeProjects} active projects · {tasks.length} tasks · {overdue} overdue
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/coordinator/tasks')}
            className="bg-[#e86024] hover:bg-[#d4521a] text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Assign Task</span>
          </button>
        </div>

        {/* Key Stat Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <StatCard icon={FolderKanban} label="Active Projects" value={activeProjects} accent="#a855f7" />
          <StatCard icon={ListChecks} label="Total Tasks" value={tasks.length} accent="#e86024" />
          <StatCard icon={Clock3} label="Pending" value={pending} accent="#f97316" />
          <StatCard icon={Loader2} label="In Progress" value={inProgress} accent="#3b82f6" />
          <StatCard icon={CheckCircle2} label="Completed" value={completed} accent="#10b981" />
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
                  className="p-4 rounded-2xl bg-[#18181c] border border-white/5 hover:border-white/15 transition-colors flex flex-col gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{p.name}</div>
                      <div className="text-[11px] text-gray-500 truncate">{p.client} · due {p.dueDate}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap shrink-0 ${PROJECT_STATUS_TONE[p.status]}`}>
                      {p.status}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-gray-400">{done}/{projectTasks.length} tasks done</span>
                      <span className="font-bold text-white">{p.progress}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
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
                          className="w-6 h-6 rounded-full bg-[#e86024]/20 border border-[#e86024]/40 ring-2 ring-[#18181c] flex items-center justify-center text-[9px] font-bold text-[#e86024]"
                        >
                          {initials(m)}
                        </span>
                      ))}
                      <span className="pl-3 text-[10px] text-gray-500">{p.members.length} members</span>
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
                          className="w-6 h-6 rounded-lg bg-[#141418] border border-white/10 hover:border-[#e86024]/50 flex items-center justify-center text-gray-400 hover:text-[#e86024] transition-colors"
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
                          className="w-6 h-6 rounded-lg bg-[#141418] border border-white/10 hover:border-[#e86024]/50 flex items-center justify-center text-gray-400 hover:text-[#e86024] transition-colors"
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
                  <span className="text-xs text-gray-300 w-28 shrink-0 truncate">{name}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#e86024] to-amber-400 rounded-full"
                      style={{ width: `${(count / maxAssigned) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-white w-5 text-right shrink-0">{count}</span>
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
              <button type="button" onClick={() => navigate('/coordinator/tasks')} className="text-xs text-[#e86024] font-semibold hover:underline cursor-pointer">
                View all
              </button>
            }
          />
          {dueSoon.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">Nothing open.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {dueSoon.map((t) => (
                <div key={t.id} className="p-3 rounded-2xl bg-[#18181c] border border-white/5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-white truncate">{t.title}</div>
                    <div className="text-[11px] text-gray-400 truncate">{t.assignee}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-semibold ${t.dueDate < TODAY ? 'text-red-400' : 'text-gray-400'}`}>
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
