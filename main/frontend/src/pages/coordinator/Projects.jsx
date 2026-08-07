import { useNavigate } from 'react-router-dom';
import { Figma, Github } from 'lucide-react';
import CoordinatorLayout from '../../components/coordinator/CoordinatorLayout';
import { SectionHeader } from '../../components/ui';
import { useTaskProject } from '../../context/TaskProjectContext';

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
                className="p-4 rounded-lg bg-card border border-border hover:border-muted-foreground/40 transition-colors flex flex-col gap-3 cursor-pointer"
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
                  <div className="flex items-center -space-x-1.5">
                    {p.members.map((m) => (
                      <span
                        key={m}
                        title={m}
                        className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 ring-2 ring-card flex items-center justify-center text-xs font-bold text-primary"
                      >
                        {initials(m)}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.figma && <Figma size={12} className="text-muted-foreground" />}
                    {p.repo && <Github size={12} className="text-muted-foreground" />}
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
