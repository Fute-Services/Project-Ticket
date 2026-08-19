import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';
import { useVisibilityAwarePolling } from '../hooks/useVisibilityAwarePolling';

// One entry per real nav item across the app — kept in sync by hand with
// IT_NAV_ITEMS/EMPLOYEE_NAV_ITEMS (ItDeskLayout.jsx) and the NAV_ITEMS
// arrays in HrLayout.jsx / CoordinatorLayout.jsx, since those own the
// canonical id/path + label for each page.
export const PAGE_REGISTRY = {
  it: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'tickets', label: 'Tickets Queue' },
    { id: 'approval', label: 'Approval Center' },
    { id: 'datarequests', label: 'Data Requests' },
    { id: 'assets', label: 'Asset Management' },
    { id: 'reports', label: 'Reports & Logs' },
    { id: 'renderstatus', label: 'Rendering Status' },
  ],
  employee: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'tickets', label: 'My Tickets' },
    { id: 'tasks', label: 'My Tasks' },
  ],
  hr: [
    { id: '/hr/overview', label: 'Dashboard' },
    { id: '/hr/directory', label: 'Directory' },
    { id: '/hr/candidates', label: 'Candidates' },
    { id: '/hr/interviews', label: 'Interviews' },
    { id: '/hr/attendance', label: 'Attendance' },
    { id: '/hr/email', label: 'Email' },
    { id: '/hr/reports', label: 'Reports' },
  ],
  coordinator: [
    { id: '/coordinator/overview', label: 'Dashboard' },
    { id: '/coordinator/projects', label: 'Projects' },
    { id: '/coordinator/tasks', label: 'Tasks' },
  ],
  // Founder's own sidebar (FounderDashboardPage.jsx SIDEBAR_ORDER) — no
  // longer auto-granted; Super Admin is the one role that bypasses this
  // registry entirely (see canAccess below).
  founder: [
    { id: 'overview', label: 'Overview' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'projects', label: 'Projects' },
    { id: 'reports', label: 'Reports' },
    { id: 'hr', label: 'HR' },
    { id: 'it', label: 'IT' },
    { id: 'sales', label: 'Sales' },
    { id: 'developers', label: 'Developers' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'branding', label: 'Branding' },
    { id: 'production', label: 'Production' },
    { id: 'chat', label: 'Team Chat' },
  ],
};

// Demo-only department roles (sales/developers/marketing/branding/production)
// have no dedicated layout/nav of their own yet — same single department
// view a founder browses — so they aren't in the registry until they do.
export const TOGGLABLE_ROLES = Object.keys(PAGE_REGISTRY);

// Granular action-level matrix — mirrors the resources actually wired to
// `requirePermission` on the backend (main/backend/middleware/permissionMiddleware.js).
// Not every resource has every action: e.g. leave/approvals are decided, not deleted.
export const RESOURCE_REGISTRY = {
  assets: { label: 'Assets', actions: ['view', 'create', 'edit', 'delete'] },
  tickets: { label: 'Tickets', actions: ['view', 'create', 'edit', 'assign'] },
  approvals: { label: 'Approvals', actions: ['view', 'approve'] },
  leave: { label: 'Leave', actions: ['view', 'approve'] },
  users: { label: 'Users', actions: ['view', 'create', 'edit', 'delete'] },
  departments: { label: 'Departments', actions: ['view', 'create', 'edit', 'delete'] },
};
export const ACTION_LABEL = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', approve: 'Approve', assign: 'Assign', export: 'Export' };

function seedPermissions() {
  const seed = {};
  for (const role of TOGGLABLE_ROLES) {
    seed[role] = new Set(PAGE_REGISTRY[role].map((p) => p.id));
  }
  return seed;
}

function fromBackend(raw) {
  const restored = {};
  for (const role of TOGGLABLE_ROLES) {
    restored[role] = new Set(Array.isArray(raw?.[role]) ? raw[role] : PAGE_REGISTRY[role].map((p) => p.id));
  }
  return restored;
}

function toBackend(permissions) {
  const serializable = {};
  for (const role of TOGGLABLE_ROLES) {
    serializable[role] = Array.from(permissions[role] || []);
  }
  return serializable;
}

// Read-only nav config that changes rarely (only when a founder toggles a
// page) — a long interval is fine since refresh() also fires immediately on
// mount and on regaining tab visibility (useVisibilityAwarePolling).
const POLL_MS = 5 * 60 * 1000;

const PermissionsContext = createContext(null);

// A founder toggling a page off on one device is meaningless if an IT
// user's session elsewhere never finds out, so this is backend-backed
// (GET /api/founder/role-permissions, readable by anyone logged in) and
// polls instead of the old same-browser-only `storage` event trick.
export function PermissionsProvider({ children }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState(seedPermissions);
  // { [role]: { [resource]: [action, ...] } } — undefined role/resource means
  // "not configured yet", which defaults to allowed (see `can` below).
  const [actionPermissions, setActionPermissions] = useState({});

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [{ data: pages }, { data: actions }] = await Promise.all([
        api.get('/api/founder/role-permissions'),
        api.get('/api/founder/action-permissions'),
      ]);
      setPermissions(fromBackend(pages));
      setActionPermissions(actions || {});
    } catch (e) {
      console.error('Failed to load role permissions:', e.response?.data?.error || e.message);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useVisibilityAwarePolling(refresh, POLL_MS, Boolean(user));

  // Mirrors the backend's requirePermission default-allow behavior so the UI
  // never hides a button the API would actually accept.
  function can(role, resource, action) {
    if (role === 'superadmin') return true;
    const allowed = actionPermissions[role]?.[resource];
    if (!allowed) return true;
    return allowed.includes(action);
  }

  async function toggleAction(role, resource, action) {
    const current = actionPermissions[role]?.[resource] ?? RESOURCE_REGISTRY[resource].actions;
    const next = current.includes(action) ? current.filter((a) => a !== action) : [...current, action];
    const nextValue = {
      ...actionPermissions,
      [role]: { ...actionPermissions[role], [resource]: next },
    };
    setActionPermissions(nextValue);
    try {
      await api.put('/api/founder/action-permissions', { permissions: nextValue });
    } catch (e) {
      console.error('Failed to save action permissions:', e.response?.data?.error || e.message);
      refresh();
    }
  }

  async function updatePermissions(updater) {
    let nextValue;
    setPermissions((prev) => {
      nextValue = updater(prev);
      return nextValue;
    });
    try {
      await api.put('/api/founder/role-permissions', { permissions: toBackend(nextValue) });
    } catch (e) {
      console.error('Failed to save role permissions:', e.response?.data?.error || e.message);
      refresh();
    }
  }

  // Super Admin always has full access — never gated, so Super Admin can
  // never lock themselves out. Founder is a regular gate-able role now (see
  // the 'founder' entry in PAGE_REGISTRY above). A per-user override (only
  // meaningful for the currently logged-in user — nobody else's overrides
  // need to be known client-side) wins over the role default when both
  // apply to the same page.
  function canAccess(role, pageId) {
    if (role === 'superadmin') return true;
    if (user?.role === role && user.permissionOverrides?.[pageId] !== undefined) {
      return user.permissionOverrides[pageId];
    }
    if (!permissions[role]) return true;
    return permissions[role].has(pageId);
  }

  function togglePermission(role, pageId) {
    updatePermissions((prev) => {
      const next = new Set(prev[role]);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return { ...prev, [role]: next };
    });
  }

  function setAllForRole(role, enabled) {
    updatePermissions((prev) => ({
      ...prev,
      [role]: enabled ? new Set(PAGE_REGISTRY[role].map((p) => p.id)) : new Set(),
    }));
  }

  return (
    <PermissionsContext.Provider
      value={{ permissions, canAccess, togglePermission, setAllForRole, actionPermissions, can, toggleAction }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
