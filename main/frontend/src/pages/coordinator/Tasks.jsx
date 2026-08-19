import { useEffect, useMemo, useState } from 'react';
import { Plus, MessageSquare, Paperclip, Figma, Github } from 'lucide-react';
import CoordinatorLayout from '../../components/coordinator/CoordinatorLayout';
import { Card, SectionHeader, Badge, Pill, Modal, Field, inputClass } from '../../components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import TaskRow from '../../components/tasks/TaskRow';
import TaskDetailPane from '../../components/tasks/TaskDetailPane';
import { TASK_STATUSES, TASK_PRIORITIES } from '../../data/coordinatorMockData';
import { employeesApi } from '../../utils/api';
import { useTaskProject } from '../../context/TaskProjectContext';
import { toast } from 'sonner';

const EMPTY_FORM = (projects, employees) => ({
  title: '',
  projectId: projects[0]?.id || '',
  assignee: employees[0]?.name || '',
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
  const { tasks, projects, addTask, moveTask, updateTask, toggleComplete, hasMoreTasks, loadMoreTasks, loadingMore } = useTaskProject();
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(() => EMPTY_FORM(projects, []));
  const [projectFilter, setProjectFilter] = useState('All');
  const [openTaskId, setOpenTaskId] = useState(null);

  // Real roster, not a hardcoded mock list — a task assigned to a name that
  // doesn't match any real signed-in user's full_name never shows up in
  // that person's "My Tasks" (EmployeeDashboardPage matches by exact name).
  useEffect(() => {
    employeesApi
      .list()
      .then(({ data }) => setEmployees(data))
      .catch((e) => console.error('Failed to load employees:', e.response?.data?.error || e.message));
  }, []);

  // The form's default assignee only has a real name to fall back to once
  // the roster has loaded — backfill it the same way the default project
  // does once `projects` arrives.
  useEffect(() => {
    if (employees.length) setForm((f) => (f.assignee ? f : { ...f, assignee: employees[0].name }));
  }, [employees]);

  const visible = projectFilter === 'All' ? tasks : tasks.filter((t) => t.projectId === projectFilter);
  const projectOf = (t) => projects.find((p) => p.id === t.projectId);

  // Track the open task by id, not by object — otherwise the pane keeps
  // rendering a stale copy after an edit.
  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) : null;

  // List view groups by status, which is how Asana's sections read: a
  // heading, a count, then the rows.
  const grouped = useMemo(
    () => TASK_STATUSES.map((status) => ({ status, items: visible.filter((t) => t.status === status) })),
    [visible]
  );

  const [assigning, setAssigning] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setAssigning(true);
    try {
      await addTask(form);
      setForm(EMPTY_FORM(projects, employees));
      setShowModal(false);
      toast.success('Task assigned', { description: `${form.title} → ${form.assignee}` });
    } catch (err) {
      toast.error('Could not assign task', { description: err.response?.data?.error || err.message });
    } finally {
      setAssigning(false);
    }
  }

  // The completion toggle is the easiest thing to hit by accident in a dense
  // list, so it offers a way straight back.
  function completeWithUndo(id) {
    const before = tasks.find((t) => t.id === id);
    toggleComplete(id);
    const nowDone = before?.status !== 'Completed';
    toast.success(nowDone ? 'Task completed' : 'Marked incomplete', {
      description: before?.title,
      action: { label: 'Undo', onClick: () => toggleComplete(id) },
    });
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
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
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

        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="board">Board</TabsTrigger>
          </TabsList>

          {/* List — the default, because scanning names top-to-bottom is
              faster than reading across columns once there are more than a
              handful of tasks. */}
          <TabsContent value="list" className="mt-4">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {visible.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  No tasks in this project yet. Use “Assign Task” to create the first one.
                </p>
              ) : (
                grouped.map(({ status, items }) =>
                  items.length === 0 ? null : (
                    <section key={status}>
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b border-border sticky top-0">
                        <h3 className="text-xs font-medium text-foreground">{status}</h3>
                        <span className="text-xs text-muted-foreground">{items.length}</span>
                      </div>
                      {items.map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          project={projectOf(t)}
                          onToggle={completeWithUndo}
                          onOpen={(task) => setOpenTaskId(task.id)}
                          showProject={projectFilter === 'All'}
                        />
                      ))}
                    </section>
                  )
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="board" className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TASK_STATUSES.map((status) => {
            const column = visible.filter((t) => t.status === status);
            return (
              <Card key={status} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{status}</h3>
                  <span className="text-xs text-muted-foreground">{column.length}</span>
                </div>
                <div className="flex flex-col gap-3 min-h-[80px]">
                  {column.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Nothing here.</p>
                  ) : (
                    column.map((t) => {
                      const project = projects.find((p) => p.id === t.projectId);
                      return (
                        <div key={t.id} className="p-3.5 rounded-lg bg-muted border border-border">
                          <div className="flex items-start justify-between mb-2">
                            <button
                              type="button"
                              onClick={() => setOpenTaskId(t.id)}
                              className="text-xs font-bold text-foreground pr-2 text-left hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              {t.title}
                            </button>
                            <Badge value={t.priority} />
                          </div>
                          {project && (
                            <div className="text-xs text-primary font-semibold mb-1 truncate">{project.name}</div>
                          )}
                          <div className="text-xs text-muted-foreground mb-2.5">{t.assignee} · due {t.dueDate}{t.duration ? ` · ${t.duration}` : ''}</div>

                          {(t.figma || t.pr) && (
                            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                              {t.figma && (
                                <a
                                  href={toHref(t.figma)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={t.figma}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-card border border-border hover:border-muted/50 text-xs font-semibold text-muted-foreground hover:text-muted-foreground transition-colors"
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
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-card border border-border hover:border-muted/50 text-xs font-semibold text-muted-foreground hover:text-muted-foreground transition-colors"
                                >
                                  <Github size={10} />
                                  {/* "…/pull/214" → "PR #214" so the pill stays short */}
                                  {t.pr.match(/\/pull\/(\d+)/) ? `PR #${t.pr.match(/\/pull\/(\d+)/)[1]}` : 'Repo'}
                                </a>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><MessageSquare size={11} /> {t.comments}</span>
                              <span className="flex items-center gap-1"><Paperclip size={11} /> {t.attachments}</span>
                            </div>
                            <select
                              value={t.status}
                              onChange={(e) => moveTask(t.id, e.target.value)}
                              className="bg-card border border-border rounded-lg px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
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
          </TabsContent>
        </Tabs>

        {hasMoreTasks && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={loadMoreTasks}
              disabled={loadingMore}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? 'Loading…' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      <TaskDetailPane
        task={openTask}
        project={openTask ? projectOf(openTask) : null}
        open={!!openTask}
        onClose={() => setOpenTaskId(null)}
        onChange={updateTask}
        onToggle={completeWithUndo}
      />

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
            <select
              required
              value={form.assignee}
              onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
              className={inputClass}
              disabled={employees.length === 0}
            >
              {employees.length === 0 ? (
                <option value="">Loading employees…</option>
              ) : (
                employees.map((e) => (
                  <option key={e.id} value={e.name}>{e.name}</option>
                ))
              )}
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
          <button
            type="submit"
            disabled={assigning}
            className="mt-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {assigning ? 'Assigning…' : 'Assign'}
          </button>
        </form>
      </Modal>
    </CoordinatorLayout>
  );
}
