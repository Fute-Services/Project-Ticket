import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Figma, Github } from 'lucide-react';
import CoordinatorLayout from '../../components/coordinator/CoordinatorLayout';
import { Card, SectionHeader, Badge } from '../../components/ui';
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

export default function CoordinatorProjectDetail() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { tasks, projects } = useTaskProject();

  const project = projects.find((p) => p.id === projectId);
  const projectTasks = tasks.filter((t) => t.projectId === projectId);

  if (!project) {
    return (
      <CoordinatorLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm text-gray-400">Project not found.</p>
          <button
            type="button"
            onClick={() => navigate('/coordinator/projects')}
            className="text-xs text-[#e86024] font-semibold hover:underline cursor-pointer"
          >
            Back to Projects
          </button>
        </div>
      </CoordinatorLayout>
    );
  }

  return (
    <CoordinatorLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <button
          type="button"
          onClick={() => navigate('/coordinator/projects')}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft size={14} />
          Back to Projects
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white tracking-tight">{project.name}</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${PROJECT_STATUS_TONE[project.status]}`}>
                {project.status}
              </span>
            </div>
            <p className="text-xs text-gray-400">{project.client} · {project.startDate} → {project.dueDate}</p>
          </div>
          <div className="flex items-center gap-2">
            {project.figma && (
              <a href={`https://${project.figma}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141418] border border-white/10 hover:border-purple-400/50 text-xs text-gray-300 hover:text-purple-300 transition-colors">
                <Figma size={13} /> Design
              </a>
            )}
            {project.repo && (
              <a href={`https://${project.repo}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141418] border border-white/10 hover:border-blue-400/50 text-xs text-gray-300 hover:text-blue-300 transition-colors">
                <Github size={13} /> Repo
              </a>
            )}
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-400">Progress</span>
            <span className="font-bold text-white">{project.progress}%</span>
          </div>
          <div className="h-2.5 bg-white/5 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full bg-gradient-to-r ${PROGRESS_BAR[project.status]} rounded-full transition-all`}
              style={{ width: `${project.progress}%` }}
            />
          </div>

          <SectionHeader title="Team" />
          <div className="flex flex-wrap gap-2">
            {project.members.map((m) => (
              <div key={m} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#18181c] border border-white/5">
                <span className="w-6 h-6 rounded-full bg-[#e86024]/20 border border-[#e86024]/40 flex items-center justify-center text-[9px] font-bold text-[#e86024]">
                  {initials(m)}
                </span>
                <span className="text-xs text-gray-200">{m}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Tasks" subtitle={`${projectTasks.length} tasks in this project`} />
          <div className="flex flex-col gap-2.5">
            {projectTasks.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No tasks assigned yet.</p>
            ) : (
              projectTasks.map((t) => (
                <div key={t.id} className="p-3 rounded-2xl bg-[#18181c] border border-white/5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{t.title}</div>
                    <div className="text-[11px] text-gray-400 truncate">{t.assignee} · due {t.dueDate}{t.duration ? ` · ${t.duration}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge value={t.priority} />
                    <Badge value={t.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </CoordinatorLayout>
  );
}
