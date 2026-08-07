import { useNavigate } from 'react-router-dom';
import { Figma, Github } from 'lucide-react';
import CoordinatorLayout from '../../components/coordinator/CoordinatorLayout';
import { SectionHeader } from '../../components/ui';
import { useTaskProject } from '../../context/TaskProjectContext';

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

function initials(name) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function CoordinatorProjects() {
  const navigate = useNavigate();
  const { tasks, projects } = useTaskProject();

  return (
    <CoordinatorLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <SectionHeader title="Project Details" subtitle={`${projects.length} projects`} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                className="p-4 rounded-2xl bg-[#141418] border border-white/10 hover:border-white/20 transition-colors flex flex-col gap-3 cursor-pointer"
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
                  <div className="flex items-center -space-x-1.5">
                    {p.members.map((m) => (
                      <span
                        key={m}
                        title={m}
                        className="w-6 h-6 rounded-full bg-[#e86024]/20 border border-[#e86024]/40 ring-2 ring-[#141418] flex items-center justify-center text-[9px] font-bold text-[#e86024]"
                      >
                        {initials(m)}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.figma && <Figma size={12} className="text-gray-500" />}
                    {p.repo && <Github size={12} className="text-gray-500" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CoordinatorLayout>
  );
}
