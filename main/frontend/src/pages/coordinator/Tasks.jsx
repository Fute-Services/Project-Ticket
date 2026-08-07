import { useState } from 'react';
import { Plus, MessageSquare, Paperclip, Figma, Github } from 'lucide-react';
import CoordinatorLayout from '../../components/coordinator/CoordinatorLayout';
import { Card, SectionHeader, Badge, Pill, Modal, Field, inputClass } from '../../components/ui';
import { TASK_STATUSES, TASK_PRIORITIES } from '../../data/coordinatorMockData';
import { employees } from '../../data/hrMockData';
import { useTaskProject } from '../../context/TaskProjectContext';

const EMPTY_FORM = (projects) => ({
  title: '',
  projectId: projects[0]?.id || '',
  assignee: employees[0].name,
  priority: 'Medium',
  dueDate: '',
  duration: '',
  figma: '',
  pr: '',
});

// Link fields are pasted as either a bare domain or a full URL — normalise
// so href always works without doubling up the scheme.
function toHref(link) {
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

export default function Tasks() {
  const { tasks, projects, addTask, moveTask } = useTaskProject();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(() => EMPTY_FORM(projects));
  const [projectFilter, setProjectFilter] = useState('All');

  const visible = projectFilter === 'All' ? tasks : tasks.filter((t) => t.projectId === projectFilter);

  function submit(e) {
    e.preventDefault();
    addTask(form);
    setForm(EMPTY_FORM(projects));
    setShowModal(false);
  }

  return (
    <CoordinatorLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <SectionHeader
          title="Task Management"
          subtitle={`${visible.length} of ${tasks.length} tasks`}
          action={
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#e86024] hover:bg-[#d4521a] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Assign Task
            </button>
          }
        />

        <div className="flex flex-wrap gap-2">
          <Pill active={projectFilter === 'All'} onClick={() => setProjectFilter('All')}>
            All Projects
          </Pill>
          {projects.map((p) => (
            <Pill key={p.id} active={projectFilter === p.id} onClick={() => setProjectFilter(p.id)}>
              {p.name}
            </Pill>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TASK_STATUSES.map((status) => {
            const column = visible.filter((t) => t.status === status);
            return (
              <Card key={status} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wide">{status}</h3>
                  <span className="text-[10px] text-gray-500">{column.length}</span>
                </div>
                <div className="flex flex-col gap-3 min-h-[80px]">
                  {column.length === 0 ? (
                    <p className="text-[11px] text-gray-600 py-4 text-center">Nothing here.</p>
                  ) : (
                    column.map((t) => {
                      const project = projects.find((p) => p.id === t.projectId);
                      return (
                        <div key={t.id} className="p-3.5 rounded-2xl bg-[#18181c] border border-white/5">
                          <div className="flex items-start justify-between mb-2">
                            <div className="text-xs font-bold text-white pr-2">{t.title}</div>
                            <Badge value={t.priority} />
                          </div>
                          {project && (
                            <div className="text-[10px] text-[#e86024] font-semibold mb-1 truncate">{project.name}</div>
                          )}
                          <div className="text-[10px] text-gray-500 mb-2.5">{t.assignee} · due {t.dueDate}{t.duration ? ` · ${t.duration}` : ''}</div>

                          {(t.figma || t.pr) && (
                            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                              {t.figma && (
                                <a
                                  href={toHref(t.figma)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={t.figma}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#141418] border border-white/10 hover:border-purple-400/50 text-[10px] font-semibold text-gray-300 hover:text-purple-300 transition-colors"
                                >
                                  <Figma size={10} />
                                  Design
                                </a>
                              )}
                              {t.pr && (
                                <a
                                  href={toHref(t.pr)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={t.pr}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#141418] border border-white/10 hover:border-blue-400/50 text-[10px] font-semibold text-gray-300 hover:text-blue-300 transition-colors"
                                >
                                  <Github size={10} />
                                  {/* "…/pull/214" → "PR #214" so the pill stays short */}
                                  {t.pr.match(/\/pull\/(\d+)/) ? `PR #${t.pr.match(/\/pull\/(\d+)/)[1]}` : 'Repo'}
                                </a>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[10px] text-gray-500">
                              <span className="flex items-center gap-1"><MessageSquare size={11} /> {t.comments}</span>
                              <span className="flex items-center gap-1"><Paperclip size={11} /> {t.attachments}</span>
                            </div>
                            <select
                              value={t.status}
                              onChange={(e) => moveTask(t.id, e.target.value)}
                              className="bg-[#141418] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#e86024] cursor-pointer"
                            >
                              {TASK_STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Assign Task">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Title">
            <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Project">
            <select value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} className={inputClass}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Assignee">
            <select value={form.assignee} onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))} className={inputClass}>
              {employees.map((e) => (
                <option key={e.id} value={e.name}>{e.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className={inputClass}>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Due Date">
              <input required type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label="Duration">
            <input
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              className={inputClass}
              placeholder="e.g. 3 days"
            />
          </Field>
          <Field label="Figma design link (optional)">
            <input
              value={form.figma}
              onChange={(e) => setForm((f) => ({ ...f, figma: e.target.value }))}
              className={inputClass}
              placeholder="figma.com/file/..."
            />
          </Field>
          <Field label="GitHub PR / repo link (optional)">
            <input
              value={form.pr}
              onChange={(e) => setForm((f) => ({ ...f, pr: e.target.value }))}
              className={inputClass}
              placeholder="github.com/fute/repo/pull/123"
            />
          </Field>
          <button type="submit" className="mt-2 bg-[#e86024] hover:bg-[#d4521a] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer">
            Assign
          </button>
        </form>
      </Modal>
    </CoordinatorLayout>
  );
}
