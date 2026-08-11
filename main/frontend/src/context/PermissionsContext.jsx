import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

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
};

// Demo-only department roles (sales/developers/marketing/branding/production)
// have no dedicated layout/nav of their own yet — same single department
// view a founder browses — so they aren't in the registry until they do.
export const TOGGLABLE_ROLES = Object.keys(PAGE_REGISTRY);

const STORAGE_KEY = 'fute_permissions';

function seedPermissions() {
  const seed = {};
  for (const role of TOGGLABLE_ROLES) {
    seed[role] = new Set(PAGE_REGISTRY[role].map((p) => p.id));
  }
  return seed;
}

// Permissions have to survive a reload and be visible across tabs — a
// founder toggling a page off in one tab is meaningless if an IT user's
// tab never finds out — so unlike ApprovalContext/TicketContext (in-memory
// demo data, fine to reset), this persists the same way AuthContext does
// (readSession/login → localStorage).
function readStoredPermissions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const restored = {};
    for (const role of TOGGLABLE_ROLES) {
      restored[role] = new Set(Array.isArray(parsed[role]) ? parsed[role] : PAGE_REGISTRY[role].map((p) => p.id));
    }
    return restored;
  } catch {
    return null;
  }
}

function writeStoredPermissions(permissions) {
  const serializable = {};
  for (const role of TOGGLABLE_ROLES) {
    serializable[role] = Array.from(permissions[role] || []);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState(() => readStoredPermissions() || seedPermissions());

  // Cross-tab live sync: the `storage` event only fires in *other* tabs
  // than the one that wrote the change, which is exactly what's needed —
  // an IT user sitting on a tab gets kicked off a page the instant a
  // founder revokes it in a different tab, not just on their next reload.
  useEffect(() => {
    function handleStorage(e) {
      if (e.key === STORAGE_KEY) {
        setPermissions(readStoredPermissions() || seedPermissions());
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  function updatePermissions(updater) {
    setPermissions((prev) => {
      const next = updater(prev);
      writeStoredPermissions(next);
      return next;
    });
  }

  // Founder always has full access — never gated, so a founder can never
  // lock themselves out by toggling their own dashboard off. A per-user
  // override (only meaningful for the currently logged-in user — nobody
  // else's overrides need to be known client-side) wins over the role
  // default when both apply to the same page.
  function canAccess(role, pageId) {
    if (role === 'founder') return true;
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
    <PermissionsContext.Provider value={{ permissions, canAccess, togglePermission, setAllForRole }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
