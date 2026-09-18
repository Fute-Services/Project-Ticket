import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Figma, Github, Plus, Pencil, Search, Archive, ArchiveRestore, Download, AlertTriangle } from 'lucide-react';
import CoordinatorLayout from '../../components/coordinator/CoordinatorLayout';
import { SectionHeader, Modal, Field, inputClass } from '../../components/ui';
import { useTaskProject } from '../../context/TaskProjectContext';
import { useEmployeeDirectory } from '../../hooks/useEmployeeDirectory';
import { toast } from 'sonner';
import { PROJECT_CODES } from '../../constants/projectCodes';

const TODAY = new Date().toISOString().slice(0, 10);

function daysFromToday(n) {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

const DUE_FILTERS = {
  All: () => true,
  Overdue: (p) => p.status !== 'Completed' && p.dueDate && p.dueDate < TODAY,
  'Due this week': (p) => p.dueDate && p.dueDate >= TODAY && p.dueDate <= daysFromToday(7),
  'Due this month': (p) => p.dueDate && p.dueDate >= TODAY && p.dueDate <= daysFromToday(30),
};

// Plain CSV, not an .xlsx lib - Excel/Sheets both open CSV natively and this
// needs zero new dependency for a one-off "give me the list" export.
function exportProjectsCsv(rows) {
  const headers = ['Code', 'Name', 'Client', 'Status', 'Start Date', 'Due Date', 'Progress %', 'Team Size'];
  const lines = [headers, ...rows.map((p) => [
    p.code || '', p.name, p.client, p.status, p.startDate || '', p.dueDate, p.progress ?? 0, (p.memberIds || []).length,
  ])].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `projects-${TODAY}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
  clientPhone: '',
  clientEmail: '',
  startDate: '',
  dueDate: '',
  status: 'On Track',
  figma: '',
  repo: '',
  documentsLink: '',
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
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dueFilter, setDueFilter] = useState('All');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (!!p.archived !== showArchived) return false;
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (!DUE_FILTERS[dueFilter](p)) return false;
      if (q && !`${p.code || ''} ${p.name} ${p.client}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, query, statusFilter, dueFilter, showArchived]);

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
      clientPhone: p.clientPhone || '',
      clientEmail: p.clientEmail || '',
      startDate: p.startDate || '',
      dueDate: p.dueDate || '',
      status: p.status,
      figma: p.figma || '',
      repo: p.repo || '',
      documentsLink: p.documentsLink || '',
      memberIds: p.memberIds || [],
    });
    setShowModal(true);
  }

  function toggleArchive(e, p) {
    e.stopPropagation();
    updateProject(p.id, { archived: !p.archived });
    toast.success(p.archived ? 'Project restored' : 'Project archived', { description: p.name });
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkArchive(archived) {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => updateProject(id, { archived })));
      toast.success(`${archived ? 'Archived' : 'Restored'} ${ids.length} project(s)`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error('Some projects could not be updated', { description: err.response?.data?.error || err.message });
    }
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
          subtitle={`${filteredProjects.length} of ${projects.length} projects`}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportProjectsCsv(filteredProjects)}
                title="Export visible projects as CSV"
                className="flex items-center gap-2 bg-muted hover:bg-muted/70 border border-border text-foreground text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <Download size={14} />
                Export
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <Plus size={14} />
                New Project
              </button>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by code, name, client…"
              className={`${inputClass} pl-8`}
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputClass} w-auto`}>
            <option value="All">All statuses</option>
            {Object.keys(PROJECT_STATUS_TONE).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={dueFilter} onChange={(e) => setDueFilter(e.target.value)} className={`${inputClass} w-auto`}>
            {Object.keys(DUE_FILTERS).map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <div className="flex items-center rounded-xl border border-border overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => setShowArchived(false)}
              className={`px-3 py-2 transition-colors cursor-pointer ${!showArchived ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setShowArchived(true)}
              className={`px-3 py-2 transition-colors cursor-pointer ${showArchived ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}
            >
              Archived
            </button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-xs font-semibold text-foreground">{selectedIds.size} selected</span>
            {showArchived ? (
              <button type="button" onClick={() => bulkArchive(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground cursor-pointer transition-colors">
                Restore
              </button>
            ) : (
              <button type="button" onClick={() => bulkArchive(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground cursor-pointer transition-colors">
                Archive
              </button>
            )}
            <button type="button" onClick={() => setSelectedIds(new Set())} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer ml-auto">
              Clear
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.length === 0 && (
            <p className="text-xs text-muted-foreground py-6 col-span-full text-center">No projects match.</p>
          )}
          {filteredProjects.map((p) => {
            const projectTasks = tasks.filter((t) => t.projectId === p.id);
            const done = projectTasks.filter((t) => t.status === 'Completed').length;
            const memberNames = (p.memberIds || []).map(nameOf);
            const overdue = p.status !== 'Completed' && p.dueDate && p.dueDate < TODAY;
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/coordinator/projects/${p.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/coordinator/projects/${p.id}`)}
                className={`p-4 rounded-lg bg-card border transition-colors flex flex-col gap-3 cursor-pointer ${
                  overdue ? 'border-destructive/50 hover:border-destructive' : 'border-border hover:border-muted-foreground/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelect(p.id)}
                      aria-label={`Select ${p.name}`}
                      className="mt-1 shrink-0 cursor-pointer"
                    />
                    <div className="min-w-0">
                    <select
                      value={p.code || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateProject(p.id, { code: e.target.value })}
                      className="block text-[11px] font-bold text-primary bg-transparent border-none p-0 mb-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30 rounded"
                      title="Project code"
                    >
                      <option value="">— code —</option>
                      {PROJECT_CODES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <div className="text-sm font-bold text-foreground truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.client} · due {p.dueDate}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {overdue && (
                      <span title="Past due date" className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap bg-destructive/10 text-destructive border-destructive/20">
                        <AlertTriangle size={11} /> Overdue
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap ${PROJECT_STATUS_TONE[p.status]}`}>
                      {p.status}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => toggleArchive(e, p)}
                      title={p.archived ? 'Restore project' : 'Archive project'}
                      aria-label={p.archived ? `Restore ${p.name}` : `Archive ${p.name}`}
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      {p.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                    </button>
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
            <Field label="Client Phone (optional)">
              <input value={form.clientPhone} onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Client Email (optional)">
              <input type="email" value={form.clientEmail} onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))} className={inputClass} />
            </Field>
          </div>
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
          <Field label="Documents link (optional)">
            <input value={form.documentsLink} onChange={(e) => setForm((f) => ({ ...f, documentsLink: e.target.value }))} className={inputClass} placeholder="drive.google.com/..." />
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
