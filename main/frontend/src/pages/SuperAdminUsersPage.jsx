import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Users, UserRound, KeyRound, Trash2, Power, Pencil, X } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { Card, SectionHeader, Badge, EmptyState, Field, inputClass } from '../components/ui';
import ConfirmDangerousAction from '../components/ConfirmDangerousAction';
import { useAuth } from '../context/AuthContext';
import { getUsers, updateUser, setUserActive, resetUserPassword, deleteUser } from '../utils/api';

const ROLE_LABEL = {
  superadmin: 'Super Admin',
  founder: 'Founder',
  hr: 'HR',
  it: 'IT',
  coordinator: 'Coordinator',
  employee: 'Employee',
  sales: 'Sales',
};

const EDITABLE_ROLES = ['it', 'hr', 'sales', 'coordinator', 'employee', 'founder'];

export default function SuperAdminUsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', department: '', role: '' });
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function load() {
    setLoading(true);
    getUsers()
      .then(({ data }) => setUsers(data))
      .catch(() => toast.error('Could not load users'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function startEdit(u) {
    setEditingId(u.id);
    setEditForm({ full_name: u.full_name || '', department: u.department || '', role: u.role });
  }

  function saveEdit(u) {
    setSaving(true);
    updateUser(u.id, editForm)
      .then(({ data }) => {
        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...data } : x)));
        setEditingId(null);
        toast.success(`Updated ${data.full_name || data.email}`);
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Could not save changes'))
      .finally(() => setSaving(false));
  }

  function toggleActive(u) {
    // Deactivating is medium-risk (reversible, but locks someone out) - a
    // typed reason via the confirm dialog; reactivating needs no gate.
    if (u.active !== false) {
      setDeactivateTarget(u);
      return;
    }
    setUserActive(u.id, true)
      .then(() => {
        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: true } : x)));
        toast.success(`${u.full_name || u.email} reactivated`);
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Could not change account status'));
  }

  function confirmDeactivate(reason) {
    const u = deactivateTarget;
    return setUserActive(u.id, false, reason).then(() => {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: false } : x)));
      toast.success(`${u.full_name || u.email} deactivated`);
    });
  }

  function confirmResetPassword(u) {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    resetUserPassword(u.id, newPassword)
      .then(() => {
        toast.success(`Password reset for ${u.full_name || u.email}`);
        setResettingId(null);
        setNewPassword('');
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Could not reset password'));
  }

  function confirmDeleteUser(reason) {
    const u = deleteTarget;
    return deleteUser(u.id, reason).then(() => {
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success(`${u.full_name || u.email} deleted`);
    });
  }

  return (
    <SuperAdminLayout>
      <div className="w-full flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5 flex items-center gap-2">
            <Users size={20} className="text-primary" />
            Users
          </h1>
          <p className="text-xs text-muted-foreground">
            Every account across every role - edit, promote/demote, deactivate, reset password, or delete.
          </p>
        </div>

        <Card>
          <SectionHeader title="All accounts" subtitle={`${users.length} total`} />

          {loading ? (
            <p className="text-xs text-muted-foreground py-4">Loading users…</p>
          ) : users.length === 0 ? (
            <EmptyState text="No accounts found." />
          ) : (
            <div className="flex flex-col gap-1">
              {users.map((u) => {
                const isMe = u.id === me?.id;
                const isEditing = editingId === u.id;
                const isResetting = resettingId === u.id;
                return (
                  <div key={u.id} className="rounded-lg border border-border overflow-hidden">
                    <div className="flex items-center gap-3 px-3.5 py-3 hover:bg-accent transition-colors">
                      <UserRound size={16} className="shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                          {u.full_name || u.email}
                          {isMe && <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary">You</span>}
                          {u.active === false && <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">Deactivated</span>}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{u.email}{u.department ? ` · ${u.department}` : ''}</div>
                      </div>
                      <Badge value={ROLE_LABEL[u.role] || u.role} />
                      {!isMe && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" title="Edit" onClick={() => startEdit(u)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
                            <Pencil size={13} />
                          </button>
                          <button type="button" title="Reset password" onClick={() => { setResettingId(u.id); setNewPassword(''); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
                            <KeyRound size={13} />
                          </button>
                          <button type="button" title={u.active === false ? 'Reactivate' : 'Deactivate'} onClick={() => toggleActive(u)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${u.active === false ? 'text-primary hover:bg-primary/10' : 'text-warning hover:bg-warning/10'}`}>
                            <Power size={13} />
                          </button>
                          <button type="button" title="Delete" onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing && (
                      <div className="px-3.5 py-3.5 bg-muted border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field label="Full name">
                          <input className={inputClass} value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} />
                        </Field>
                        <Field label="Department">
                          <input className={inputClass} value={editForm.department} onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))} />
                        </Field>
                        <Field label="Role">
                          <select className={inputClass} value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
                            {EDITABLE_ROLES.map((r) => (
                              <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>
                            ))}
                          </select>
                        </Field>
                        <div className="sm:col-span-3 flex items-center gap-2 justify-end">
                          <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                            Cancel
                          </button>
                          <button type="button" disabled={saving} onClick={() => saveEdit(u)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground transition-colors cursor-pointer">
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}

                    {isResetting && (
                      <div className="px-3.5 py-3.5 bg-muted border-t border-border flex items-center gap-2">
                        <input
                          type="password"
                          minLength={10}
                          placeholder="New password (min 10 chars)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={inputClass}
                        />
                        <button type="button" onClick={() => confirmResetPassword(u)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground transition-colors cursor-pointer whitespace-nowrap">
                          Set password
                        </button>
                        <button type="button" onClick={() => setResettingId(null)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer">
                          <X size={14} />
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
          open={Boolean(deactivateTarget)}
          onClose={() => setDeactivateTarget(null)}
          title="Deactivate account"
          description={deactivateTarget ? `${deactivateTarget.full_name || deactivateTarget.email} will be signed out and unable to log in until reactivated.` : undefined}
          requirePassword={false}
          onConfirm={confirmDeactivate}
        />
        <ConfirmDangerousAction
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Delete account"
          description={deleteTarget ? `${deleteTarget.full_name || deleteTarget.email} will be permanently deleted. This can't be undone.` : undefined}
          requirePassword
          onConfirm={confirmDeleteUser}
        />
      </div>
    </SuperAdminLayout>
  );
}
