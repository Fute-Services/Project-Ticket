import { useNavigate } from 'react-router-dom';
import { ListChecks, Clock3, Loader2, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import CoordinatorLayout from '../../components/coordinator/CoordinatorLayout';
import { Card, SectionHeader, StatCard, Badge } from '../../components/ui';
import DonutChart from '../../components/DonutChart';
import { tasks, TASK_STATUSES } from '../../data/coordinatorMockData';

const TODAY = '2026-08-06';

const STATUS_COLOR = { Pending: '#f97316', 'In Progress': '#3b82f6', Completed: '#10b981' };

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

  const pending = tasks.filter((t) => t.status === 'Pending').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const overdue = tasks.filter((t) => t.status !== 'Completed' && t.dueDate < TODAY).length;

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
              {tasks.length} tasks across the team · {overdue} overdue
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <StatCard icon={ListChecks} label="Total Tasks" value={tasks.length} accent="#e86024" />
          <StatCard icon={Clock3} label="Pending" value={pending} accent="#f97316" />
          <StatCard icon={Loader2} label="In Progress" value={inProgress} accent="#3b82f6" />
          <StatCard icon={CheckCircle2} label="Completed" value={completed} accent="#10b981" />
          <StatCard icon={AlertTriangle} label="Overdue" value={overdue} accent="#ef4444" />
        </div>

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
