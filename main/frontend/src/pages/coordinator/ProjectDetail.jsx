import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Figma, Github, Pencil, Plus, FileText, Phone, Mail, X } from 'lucide-react';
import CoordinatorLayout from '../../components/coordinator/CoordinatorLayout';
import { Card, SectionHeader, Badge, Modal, Field, inputClass } from '../../components/ui';
import { useTaskProject } from '../../context/TaskProjectContext';
import { useEmployeeDirectory } from '../../hooks/useEmployeeDirectory';
import { TASK_PRIORITIES } from '../../data/coordinatorMockData';
import { toast } from 'sonner';

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

const EMPTY_TASK_FORM = (memberIds) => ({
  title: '',
  assigneeId: memberIds[0] || '',
  priority: 'Medium',
  dueDate: '',
  duration: '',
  figma: '',
  pr: '',
});

export default function CoordinatorProjectDetail() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { tasks, projects, addTask, updateProject } = useTaskProject();
  const { employees, nameOf } = useEmployeeDirectory();

  const project = projects.find((p) => p.id === projectId);
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const memberIds = project?.memberIds || [];

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(() => EMPTY_TASK_FORM(memberIds));
  const [assigning, setAssigning] = useState(false);
  const [milestoneDraft, setMilestoneDraft] = useState('');

  // Coordinator's "who's doing what" view - every task on this project,
  // bucketed by the member holding it. A task's owner can be untagged from
  // the project later (see updateProject) while keeping their existing
  // tasks (a deliberate choice, not a bug) - that owner falls out of
  // `memberIds`/the employee directory lookup, so those tasks are grouped
  // by their own stored `assignee` name instead of a nameless "Unassigned"
  // catch-all.
  const tasksByMember = useMemo(() => {
    const byAssignee = new Map();
    for (const t of projectTasks) {
      const key = t.assigneeId || '';
      if (!byAssignee.has(key)) byAssignee.set(key, []);
      byAssignee.get(key).push(t);
    }
    const groups = memberIds.map((id) => ({ id, name: nameOf(id), items: byAssignee.get(id) || [] }));
    for (const [id, items] of byAssignee) {
      if (id && !memberIds.includes(id)) {
        groups.push({ id, name: `${items[0].assignee || 'Unknown'} (no longer tagged)`, items });
      }
    }
    const noAssignee = byAssignee.get('') || [];
    if (noAssignee.length) groups.push({ id: null, name: 'Unassigned', items: noAssignee });
    return groups;
  }, [memberIds, projectTasks, nameOf]);

  const projectUpdates = useMemo(
    () => projectTasks.filter((t) => t.remarks && t.remarksAt).sort((a, b) => b.remarksAt.localeCompare(a.remarksAt)),
    [projectTasks]
  );

  function openEdit() {
    setEditForm({
      name: project.name,
      client: project.client,
      clientPhone: project.clientPhone || '',
      clientEmail: project.clientEmail || '',
      startDate: project.startDate || '',
      dueDate: project.dueDate || '',
      status: project.status,
      figma: project.figma || '',
      repo: project.repo || '',
      documentsLink: project.documentsLink || '',
      memberIds,
    });
    setEditOpen(true);
  }

  const checklist = project.checklist || [];
  function newChecklistId() {
    return `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  }
  function addMilestone(e) {
    e.preventDefault();
    const text = milestoneDraft.trim();
    if (!text) return;
    updateProject(project.id, { checklist: [...checklist, { id: newChecklistId(), text, done: false }] });
    setMilestoneDraft('');
  }
  function toggleMilestone(id) {
    updateProject(project.id, { checklist: checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) });
  }
  function removeMilestone(id) {
    updateProject(project.id, { checklist: checklist.filter((c) => c.id !== id) });
  }

  function setBilling(field, value) {
    updateProject(project.id, { [field]: value === '' ? 0 : Number(value) });
  }

  function toggleEditMember(id) {
    setEditForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id) ? f.memberIds.filter((m) => m !== id) : [...f.memberIds, id],
    }));
  }

  async function submitEdit(e) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await updateProject(project.id, editForm);
      toast.success('Project updated', { description: editForm.name });
      setEditOpen(false);
    } catch (err) {
      toast.error('Could not update project', { description: err.response?.data?.error || err.message });
    } finally {
      setSavingEdit(false);
    }
  }

  function openAssign() {
    setTaskForm(EMPTY_TASK_FORM(memberIds));
    setAssignOpen(true);
  }

  async function submitAssign(e) {
    e.preventDefault();
    setAssigning(true);
    try {
      await addTask({ ...taskForm, projectId: project.id });
      toast.success('Task assigned', { description: `${taskForm.title} → ${nameOf(taskForm.assigneeId)}` });
      setAssignOpen(false);
    } catch (err) {
      toast.error('Could not assign task', { description: err.response?.data?.error || err.message });
    } finally {
      setAssigning(false);
    }
  }

  if (!project) {
    return (
      <CoordinatorLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm text-muted-foreground">Project not found.</p>
          <button
            type="button"
            onClick={() => navigate('/coordinator/projects')}
            className="text-xs text-primary font-semibold hover:underline cursor-pointer"
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
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft size={14} />
          Back to Projects
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">{project.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${PROJECT_STATUS_TONE[project.status]}`}>
                {project.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{project.client} · {project.startDate} → {project.dueDate}</p>
            {(project.clientPhone || project.clientEmail) && (
              <div className="flex items-center gap-3 mt-1">
                {project.clientPhone && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone size={11} /> {project.clientPhone}
                  </span>
                )}
                {project.clientEmail && (
                  <a href={`mailto:${project.clientEmail}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Mail size={11} /> {project.clientEmail}
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {project.figma && (
              <a href={`https://${project.figma}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border hover:border-muted/50 text-xs text-muted-foreground hover:text-muted-foreground transition-colors">
                <Figma size={13} /> Design
              </a>
            )}
            {project.repo && (
              <a href={`https://${project.repo}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border hover:border-muted/50 text-xs text-muted-foreground hover:text-muted-foreground transition-colors">
                <Github size={13} /> Repo
              </a>
            )}
            {project.documentsLink && (
              <a href={`https://${project.documentsLink}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border hover:border-muted/50 text-xs text-muted-foreground hover:text-muted-foreground transition-colors">
                <FileText size={13} /> Documents
              </a>
            )}
            <button
              type="button"
              onClick={openEdit}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border hover:border-muted/50 text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              <Pencil size={13} /> Edit
            </button>
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-bold text-foreground">{project.progress}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className={`h-full bg-gradient-to-r ${PROGRESS_BAR[project.status]} rounded-full transition-all`}
              style={{ width: `${project.progress}%` }}
            />
          </div>

          <SectionHeader title="Team" subtitle={`${memberIds.length} tagged`} />
          <div className="flex flex-wrap gap-2">
            {memberIds.length === 0 ? (
              <p className="text-xs text-muted-foreground">No one tagged on this project yet — edit it to add members.</p>
            ) : (
              memberIds.map((id) => {
                const m = nameOf(id);
                return (
                  <div key={id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-muted border border-border">
                    <span className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary">
                      {initials(m)}
                    </span>
                    <span className="text-xs text-foreground">{m}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="h-px bg-border my-5" />

          <SectionHeader
            title="Tasks"
            subtitle={`${projectTasks.length} tasks · who's doing what`}
            action={
              <button
                type="button"
                onClick={openAssign}
                disabled={memberIds.length === 0}
                title={memberIds.length === 0 ? 'Tag at least one member before assigning tasks' : undefined}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={13} /> Assign Task
              </button>
            }
          />
          {projectTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tasks assigned yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {tasksByMember.map(({ id, name, items }) =>
                items.length === 0 ? null : (
                  <div key={id ?? 'unassigned'}>
                    <div className="text-xs font-semibold text-muted-foreground mb-1.5">{name} · {items.length}</div>
                    <div className="flex flex-col gap-2">
                      {items.map((t) => (
                        <div key={t.id} className="p-3 rounded-lg bg-muted border border-border flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-foreground truncate">{t.title}</div>
                            <div className="text-xs text-muted-foreground truncate">due {t.dueDate}{t.duration ? ` · ${t.duration}` : ''}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge value={t.priority} />
                            <Badge value={t.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Milestones" subtitle="Project-level checklist" />
          <div className="flex flex-col gap-1.5">
            {checklist.map((c) => (
              <div key={c.id} className="flex items-center gap-2 group">
                <input type="checkbox" checked={c.done} onChange={() => toggleMilestone(c.id)} className="cursor-pointer" />
                <span className={`text-sm flex-1 ${c.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{c.text}</span>
                <button type="button" onClick={() => removeMilestone(c.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive cursor-pointer transition-opacity">
                  <X size={12} />
                </button>
              </div>
            ))}
            {checklist.length === 0 && <p className="text-xs text-muted-foreground">No milestones yet.</p>}
          </div>
          <form onSubmit={addMilestone} className="flex items-center gap-2 mt-2.5">
            <input
              value={milestoneDraft}
              onChange={(e) => setMilestoneDraft(e.target.value)}
              placeholder="Add a milestone…"
              className={`${inputClass} flex-1`}
            />
            <button type="submit" disabled={!milestoneDraft.trim()} className="p-2 rounded-md bg-muted hover:bg-accent text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shrink-0">
              <Plus size={14} />
            </button>
          </form>

          <div className="h-px bg-border my-5" />

          <SectionHeader title="Billing" subtitle="Budget vs. invoiced vs. paid" />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Budget">
              <input key={`budget-${project.budget}`} type="number" min="0" defaultValue={project.budget || 0} onBlur={(e) => setBilling('budget', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Invoiced">
              <input key={`inv-${project.invoicedAmount}`} type="number" min="0" defaultValue={project.invoicedAmount || 0} onBlur={(e) => setBilling('invoicedAmount', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Paid">
              <input key={`paid-${project.paidAmount}`} type="number" min="0" defaultValue={project.paidAmount || 0} onBlur={(e) => setBilling('paidAmount', e.target.value)} className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Activity" subtitle="Every update posted on this project's tasks, newest first" />
          {projectUpdates.length === 0 ? (
            <p className="text-xs text-muted-foreground">No updates posted yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {projectUpdates.map((t) => (
                <div key={t.id} className="p-3 rounded-lg bg-muted border border-border flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground truncate">{t.title}</span>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">{new Date(t.remarksAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-foreground/80 whitespace-pre-wrap">{t.remarks}</p>
                  <p className="text-[11px] text-muted-foreground">{t.remarksBy}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Project">
        {editForm && (
          <form onSubmit={submitEdit} className="flex flex-col gap-3">
            <Field label="Name">
              <input required value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Client">
              <input required value={editForm.client} onChange={(e) => setEditForm((f) => ({ ...f, client: e.target.value }))} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Client Phone (optional)">
                <input value={editForm.clientPhone} onChange={(e) => setEditForm((f) => ({ ...f, clientPhone: e.target.value }))} className={inputClass} />
              </Field>
              <Field label="Client Email (optional)">
                <input type="email" value={editForm.clientEmail} onChange={(e) => setEditForm((f) => ({ ...f, clientEmail: e.target.value }))} className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date">
                <input type="date" value={editForm.startDate} onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))} className={inputClass} />
              </Field>
              <Field label="Due Date">
                <input required type="date" value={editForm.dueDate} onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))} className={inputClass} />
              </Field>
            </div>
            <Field label="Status">
              <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className={inputClass}>
                {Object.keys(PROJECT_STATUS_TONE).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Figma design link (optional)">
              <input value={editForm.figma} onChange={(e) => setEditForm((f) => ({ ...f, figma: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="GitHub repo link (optional)">
              <input value={editForm.repo} onChange={(e) => setEditForm((f) => ({ ...f, repo: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Documents link (optional)">
              <input value={editForm.documentsLink} onChange={(e) => setEditForm((f) => ({ ...f, documentsLink: e.target.value }))} className={inputClass} placeholder="drive.google.com/..." />
            </Field>
            <Field label="Team — tag employees on this project">
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto border border-input rounded-md p-2">
                {employees.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={editForm.memberIds.includes(emp.id)}
                      onChange={() => toggleEditMember(emp.id)}
                      className="cursor-pointer"
                    />
                    {emp.full_name}
                  </label>
                ))}
              </div>
            </Field>
            <button
              type="submit"
              disabled={savingEdit}
              className="mt-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingEdit ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        )}
      </Modal>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Task">
        <form onSubmit={submitAssign} className="flex flex-col gap-3">
          <Field label="Title">
            <input required value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Assignee" hint="Only members tagged on this project can be assigned.">
            <select
              required
              value={taskForm.assigneeId}
              onChange={(e) => setTaskForm((f) => ({ ...f, assigneeId: e.target.value }))}
              className={inputClass}
            >
              {memberIds.map((id) => (
                <option key={id} value={id}>{nameOf(id)}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <select value={taskForm.priority} onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))} className={inputClass}>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Due Date">
              <input required type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label="Duration">
            <input value={taskForm.duration} onChange={(e) => setTaskForm((f) => ({ ...f, duration: e.target.value }))} className={inputClass} placeholder="e.g. 3 days" />
          </Field>
          <Field label="Figma design link (optional)">
            <input value={taskForm.figma} onChange={(e) => setTaskForm((f) => ({ ...f, figma: e.target.value }))} className={inputClass} placeholder="figma.com/file/..." />
          </Field>
          <Field label="GitHub PR / repo link (optional)">
            <input value={taskForm.pr} onChange={(e) => setTaskForm((f) => ({ ...f, pr: e.target.value }))} className={inputClass} placeholder="github.com/fute/repo/pull/123" />
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
