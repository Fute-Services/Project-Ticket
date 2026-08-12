import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Shield, Crown, UserRound, RotateCcw, UserPlus, X } from 'lucide-react';
import { usePermissions, PAGE_REGISTRY, TOGGLABLE_ROLES } from '../context/PermissionsContext';
import { getUsers, createUser, updateUserPermissions } from '../utils/api';
import { Card, SectionHeader } from './ui';
import { Switch } from './ui/switch';

const NEW_USER_FORM_EMPTY = { email: '', full_name: '', password: '' };

const ROLE_LABEL = {
  founder: 'Founder',
  hr: 'HR',
  it: 'IT',
  coordinator: 'Coordinator',
  employee: 'Employee',
};

// Matches the backend's founderController.ASSIGNABLE_ROLES — Super Admin
// can override an existing Founder's pages, but can't mint a brand-new
// Founder (or another Super Admin) account from this screen.
const CREATABLE_ROLES = ['it', 'hr', 'coordinator', 'employee'];

export default function RolePermissionsView() {
  const { permissions, canAccess, togglePermission, setAllForRole } = usePermissions();
  const [role, setRole] = useState(TOGGLABLE_ROLES[0]);

  const pages = PAGE_REGISTRY[role];
  const enabledCount = permissions[role]?.size ?? 0;
  const canCreateForRole = CREATABLE_ROLES.includes(role);

  function handleToggle(pageId, label) {
    const wasEnabled = canAccess(role, pageId);
    togglePermission(role, pageId);
    toast.success(`${label} ${wasEnabled ? 'disabled' : 'enabled'} for ${ROLE_LABEL[role] || role}`);
  }

  // --- Per-user overrides ---
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUserForm, setNewUserForm] = useState(NEW_USER_FORM_EMPTY);
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUsersLoading(true);
    setSelectedEmail('');
    setShowNewUserForm(false);
    setNewUserForm(NEW_USER_FORM_EMPTY);
    getUsers(role)
      .then(({ data }) => {
        if (!cancelled) setUsers(data);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load users');
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  const selectedUser = users.find((u) => u.email === selectedEmail) || null;

  function updateSelectedUser(nextOverrides) {
    if (!selectedUser) return;
    updateUserPermissions(selectedUser.id, nextOverrides)
      .then(() => {
        setUsers((prev) =>
          prev.map((u) => (u.email === selectedUser.email ? { ...u, permissionOverrides: nextOverrides } : u))
        );
      })
      .catch(() => toast.error('Could not save that change'));
  }

  function handleUserToggle(pageId, label) {
    const current = selectedUser?.permissionOverrides || {};
    const effective = current[pageId] !== undefined ? current[pageId] : canAccess(role, pageId);
    const next = { ...current, [pageId]: !effective };
    updateSelectedUser(next);
    toast.success(`${label} ${!effective ? 'enabled' : 'disabled'} for ${selectedUser.full_name || selectedUser.email}`);
  }

  function handleResetOverride(pageId, label) {
    const current = selectedUser?.permissionOverrides || {};
    if (current[pageId] === undefined) return;
    const next = { ...current };
    delete next[pageId];
    updateSelectedUser(next);
    toast.success(`${label} reset to ${ROLE_LABEL[role] || role} default for ${selectedUser.full_name || selectedUser.email}`);
  }

  // --- Create a new account for this role, right from this page ---
  function handleCreateUser(e) {
    e.preventDefault();
    if (!newUserForm.email.trim() || !newUserForm.full_name.trim() || newUserForm.password.length < 6) {
      toast.error('Enter an email, name, and a password of at least 6 characters');
      return;
    }
    const payload = { ...newUserForm, role };
    setCreatingUser(true);
    createUser(payload)
      .then(({ data }) => data)
      .then((created) => {
        setUsers((prev) => [...prev, created]);
        setSelectedEmail(created.email);
        setShowNewUserForm(false);
        setNewUserForm(NEW_USER_FORM_EMPTY);
        toast.success(`${created.full_name} added as ${ROLE_LABEL[role] || role}`, { description: created.email });
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || err.message || 'Could not create that account');
      })
      .finally(() => setCreatingUser(false));
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5 flex items-center gap-2">
          <Shield size={20} className="text-primary" />
          Role Permissions
        </h1>
        <p className="text-xs text-muted-foreground">Control which pages each role, or a specific person, can see.</p>
      </div>

      {/* Role selector */}
      <div className="flex flex-wrap gap-1.5">
        {TOGGLABLE_ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              role === r
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {ROLE_LABEL[r] || r}
          </button>
        ))}
        <div className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-warning/10 border border-warning/20 text-warning flex items-center gap-1.5">
          <Crown size={12} />
          Super Admin: full access, always on
        </div>
      </div>

      {/* Role-level toggles on the left, per-user overrides on the right,
          side by side instead of stacked. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <Card>
        <SectionHeader
          title={`${ROLE_LABEL[role] || role}: visible pages`}
          subtitle={`${enabledCount} of ${pages.length} pages enabled`}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAllForRole(role, true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Enable all
              </button>
              <button
                type="button"
                onClick={() => setAllForRole(role, false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Disable all
              </button>
            </div>
          }
        />

        <div className="flex flex-col gap-1">
          {pages.map((page) => {
            const enabled = canAccess(role, page.id);
            return (
              <div
                key={page.id}
                className="flex items-center justify-between px-3.5 py-3 rounded-lg hover:bg-accent transition-colors"
              >
                <span className="text-sm font-medium text-foreground">{page.label}</span>
                <Switch
                  checked={enabled}
                  onCheckedChange={() => handleToggle(page.id, page.label)}
                  label={`Toggle ${page.label} for ${role}`}
                />
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="Per-user overrides"
          subtitle={`Override a specific ${ROLE_LABEL[role] || role} person's pages`}
          action={
            canCreateForRole && (
              <button
                type="button"
                onClick={() => setShowNewUserForm((p) => !p)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {showNewUserForm ? <X size={12} /> : <UserPlus size={12} />}
                {showNewUserForm ? 'Cancel' : `Add ${ROLE_LABEL[role] || role} account`}
              </button>
            )
          }
        />

        {showNewUserForm && canCreateForRole && (
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 gap-3 mb-5 p-3.5 rounded-lg bg-muted border border-border">
            <input
              required
              type="email"
              value={newUserForm.email}
              onChange={(e) => setNewUserForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Email address"
              className="bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <input
              required
              value={newUserForm.full_name}
              onChange={(e) => setNewUserForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Full name"
              className="bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <input
              required
              type="password"
              minLength={6}
              value={newUserForm.password}
              onChange={(e) => setNewUserForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Initial password"
              className="bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={creatingUser}
              className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
            >
              {creatingUser ? 'Creating…' : `Create as ${ROLE_LABEL[role] || role}`}
            </button>
          </form>
        )}

        {usersLoading ? (
          <p className="text-xs text-muted-foreground py-4">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">
            No {ROLE_LABEL[role] || role} accounts {canCreateForRole ? 'yet. Add one above.' : 'found.'}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* User list */}
            <div className="flex flex-col gap-1">
              {users.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => setSelectedEmail(u.email)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                    selectedEmail === u.email
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted border border-border text-foreground hover:bg-accent'
                  }`}
                >
                  <UserRound size={14} className="shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{u.full_name || u.email}</div>
                    <div className={`text-[10px] truncate ${selectedEmail === u.email ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {u.email}
                    </div>
                  </div>
                  {Object.keys(u.permissionOverrides || {}).length > 0 && (
                    <span className="ml-auto shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-warning/20 text-warning">
                      Custom
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Selected user's page overrides */}
            <div className="min-w-0">
              {!selectedUser ? (
                <p className="text-xs text-muted-foreground py-4">Pick a person above to override their pages.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {pages.map((page) => {
                    const overrides = selectedUser.permissionOverrides || {};
                    const hasOverride = overrides[page.id] !== undefined;
                    const effective = hasOverride ? overrides[page.id] : canAccess(role, page.id);
                    return (
                      <div
                        key={page.id}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-lg transition-colors ${
                          hasOverride ? 'bg-warning/5 border border-warning/20' : 'hover:bg-accent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">{page.label}</span>
                          {hasOverride && (
                            <button
                              type="button"
                              onClick={() => handleResetOverride(page.id, page.label)}
                              title="Reset to role default"
                              className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-warning hover:text-warning/80 cursor-pointer"
                            >
                              <RotateCcw size={10} />
                              Reset to default
                            </button>
                          )}
                        </div>
                        <Switch
                          checked={effective}
                          onCheckedChange={() => handleUserToggle(page.id, page.label)}
                          label={`Toggle ${page.label} for ${selectedUser.email}`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}
