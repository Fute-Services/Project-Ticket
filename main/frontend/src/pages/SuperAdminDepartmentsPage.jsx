import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Pencil, Power, Trash2, Plus, X } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { Card, SectionHeader, EmptyState, Field, inputClass } from '../components/ui';
import ConfirmDangerousAction from '../components/ConfirmDangerousAction';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../utils/api';

export default function SuperAdminDepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  function load() {
    setLoading(true);
    getDepartments()
      .then(({ data }) => setDepartments(data))
      .catch(() => toast.error('Could not load departments'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function submitCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    createDepartment({ name: newName.trim() })
      .then(({ data }) => {
        setDepartments((prev) => [...prev, data]);
        setNewName('');
        setCreating(false);
        toast.success(`Department "${data.name}" created`);
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Could not create department'))
      .finally(() => setSaving(false));
  }

  function startEdit(d) {
    setEditingId(d.id);
    setEditName(d.name);
  }

  function saveEdit(d) {
    if (!editName.trim()) return;
    setSaving(true);
    updateDepartment(d.id, { name: editName.trim() })
      .then(({ data }) => {
        setDepartments((prev) => prev.map((x) => (x.id === d.id ? { ...x, ...data } : x)));
        setEditingId(null);
        toast.success('Department updated');
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Could not save changes'))
      .finally(() => setSaving(false));
  }

  function toggleActive(d) {
    const next = !d.active;
    updateDepartment(d.id, { active: next })
      .then(() => {
        setDepartments((prev) => prev.map((x) => (x.id === d.id ? { ...x, active: next } : x)));
        toast.success(`"${d.name}" ${next ? 'activated' : 'deactivated'}`);
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Could not change status'));
  }

  function confirmDeleteDepartment(reason) {
    const d = deleteTarget;
    return deleteDepartment(d.id, reason).then(() => {
      setDepartments((prev) => prev.filter((x) => x.id !== d.id));
      toast.success(`"${d.name}" deleted`);
    });
  }

  return (
    <SuperAdminLayout>
      <div className="w-full flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5 flex items-center gap-2">
            <Building2 size={20} className="text-primary" />
            Departments
          </h1>
          <p className="text-xs text-muted-foreground">
            Organization units - create, rename, deactivate, or delete. Deleting is blocked while any user is still assigned to it.
          </p>
        </div>

        <Card>
          <SectionHeader
            title="All departments"
            subtitle={`${departments.length} total`}
            action={
              !creating && (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground transition-colors cursor-pointer"
                >
                  <Plus size={13} /> New department
                </button>
              )
            }
          />

          {creating && (
            <div className="mb-4 flex items-end gap-2 p-3.5 rounded-lg border border-border bg-muted">
              <Field label="Name">
                <input
                  className={inputClass}
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Finance"
                />
              </Field>
              <button
                type="button"
                disabled={saving}
                onClick={submitCreate}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground transition-colors cursor-pointer whitespace-nowrap"
              >
                {saving ? 'Saving…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setNewName(''); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-xs text-muted-foreground py-4">Loading departments…</p>
          ) : departments.length === 0 ? (
            <EmptyState text="No departments yet." />
          ) : (
            <div className="flex flex-col gap-1">
              {departments.map((d) => {
                const isEditing = editingId === d.id;
                return (
                  <div key={d.id} className="rounded-lg border border-border overflow-hidden">
                    <div className="flex items-center gap-3 px-3.5 py-3 hover:bg-accent transition-colors">
                      <Building2 size={16} className="shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                          {d.name}
                          {d.active === false && (
                            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" title="Rename" onClick={() => startEdit(d)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          title={d.active === false ? 'Activate' : 'Deactivate'}
                          onClick={() => toggleActive(d)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${d.active === false ? 'text-primary hover:bg-primary/10' : 'text-warning hover:bg-warning/10'}`}
                        >
                          <Power size={13} />
                        </button>
                        <button type="button" title="Delete" onClick={() => setDeleteTarget(d)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="px-3.5 py-3.5 bg-muted border-t border-border flex items-end gap-2">
                        <Field label="Name">
                          <input className={inputClass} value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </Field>
                        <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                          Cancel
                        </button>
                        <button type="button" disabled={saving} onClick={() => saveEdit(d)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground transition-colors cursor-pointer">
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <ConfirmDangerousAction
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Delete department"
          description={deleteTarget ? `"${deleteTarget.name}" will be permanently deleted. This can't be undone.` : undefined}
          requirePassword
          onConfirm={confirmDeleteDepartment}
        />
      </div>
    </SuperAdminLayout>
  );
}
