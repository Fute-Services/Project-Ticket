import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Figma, Github, Plus, Pencil } from 'lucide-react';
import CoordinatorLayout from '../../components/coordinator/CoordinatorLayout';
import { SectionHeader, Modal, Field, inputClass } from '../../components/ui';
import { useTaskProject } from '../../context/TaskProjectContext';
import { useEmployeeDirectory } from '../../hooks/useEmployeeDirectory';
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

const EMPTY_FORM = () => ({
  name: '',
  client: '',
  startDate: '',
  dueDate: '',
  status: 'On Track',
  figma: '',
  repo: '',
  memberIds: [],
});

export default function CoordinatorProjects() {
  const navigate = useNavigate();
  const { tasks, projects, addProject, updateProject } = useTaskProject();
  const { employees, nameOf } = useEmployeeDirectory();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM());
    setShowModal(true);
  }

  function openEdit(e, p) {
    e.stopPropagation();
    setEditingId(p.id);
    setForm({
      name: p.name,
      client: p.client,
      startDate: p.startDate || '',
      dueDate: p.dueDate || '',
      status: p.status,
      figma: p.figma || '',
      repo: p.repo || '',
      memberIds: p.memberIds || [],
    });
    setShowModal(true);
  }

  function toggleMember(id) {
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id) ? f.memberIds.filter((m) => m !== id) : [...f.memberIds, id],
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateProject(editingId, form);
        toast.success('Project updated', { description: form.name });
      } else {
        await addProject(form);
        toast.success('Project created', { description: form.name });
      }
      setShowModal(false);
    } catch (err) {
      toast.error(editingId ? 'Could not update project' : 'Could not create project', {
        description: err.response?.data?.error || err.message,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <CoordinatorLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <SectionHeader
          title="Project Details"
          subtitle={`${projects.length} projects`}
          action={
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Plus size={14} />
              New Project
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const projectTasks = tasks.filter((t) => t.projectId === p.id);
            const done = projectTasks.filter((t) => t.status === 'Completed').length;
            const memberNames = (p.memberIds || []).map(nameOf);
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap ${PROJECT_STATUS_TONE[p.status]}`}>
                      {p.status}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => openEdit(e, p)}
                      title="Edit project"
                      aria-label={`Edit ${p.name}`}
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
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
                    {memberNames.map((m, i) => (
                      <span
                        key={(p.memberIds || [])[i]}
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Project' : 'New Project'}>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Name">
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Client">
            <input required value={form.client} onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Due Date">
              <input required type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputClass}>
              {Object.keys(PROJECT_STATUS_TONE).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Figma design link (optional)">
            <input value={form.figma} onChange={(e) => setForm((f) => ({ ...f, figma: e.target.value }))} className={inputClass} placeholder="figma.com/file/..." />
          </Field>
          <Field label="GitHub repo link (optional)">
            <input value={form.repo} onChange={(e) => setForm((f) => ({ ...f, repo: e.target.value }))} className={inputClass} placeholder="github.com/fute/repo" />
          </Field>
          <Field label="Team — tag employees on this project">
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto border border-input rounded-md p-2">
              {employees.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1">Loading employees…</p>
              ) : (
                employees.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={form.memberIds.includes(emp.id)}
                      onChange={() => toggleMember(emp.id)}
                      className="cursor-pointer"
                    />
                    {emp.full_name}
                  </label>
                ))
              )}
            </div>
          </Field>
          <button
            type="submit"
            disabled={saving}
            className="mt-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Project'}
          </button>
        </form>
      </Modal>
    </CoordinatorLayout>
  );
}
