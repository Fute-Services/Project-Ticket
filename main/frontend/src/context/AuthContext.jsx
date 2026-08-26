import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, logoutUser } from '../utils/api';
import { useVisibilityAwarePolling } from '../hooks/useVisibilityAwarePolling';

// Keeps a logged-in user's role/permissionOverrides current (a Super Admin
// can change these mid-session) without requiring a manual page refresh.
const POLL_MS = 15 * 1000;

const AuthContext = createContext(null);

// Where each role lands after signing in (PRD §4.1 — one login UI, role-based routing)
export const HOME_FOR_ROLE = {
  founder: '/founder/dashboard',
  superadmin: '/superadmin/overview',
  hr: '/hr/overview',
  it: '/it/dashboard',
  coordinator: '/coordinator/overview',
  employee: '/employee/dashboard',
  // Demo-only roles: same illustrative data the Founder already sees when
  // browsing these departments (see data/deptDemoData.js) — these accounts
  // exist so anyone can preview that view without going through the
  // Founder's dashboard. There's no dedicated backend or workflow behind
  // them yet, same as when a founder views them.
  sales: '/department/sales',
  developers: '/department/developers',
  marketing: '/department/marketing',
  branding: '/department/branding',
  production: '/department/production',
};

export function homeFor(role) {
  return HOME_FOR_ROLE[role] || HOME_FOR_ROLE.employee;
}

// "Remember me" is real, not decorative: checked writes to localStorage and
// survives closing the browser; unchecked writes to sessionStorage and clears
// when the tab does. api.js's request interceptor checks both.
function readSession() {
  for (const store of [localStorage, sessionStorage]) {
    const stored = store.getItem('fute_user');
    const storedToken = store.getItem('fute_token');
    if (stored && storedToken) {
      try {
        return { user: JSON.parse(stored), token: storedToken };
      } catch {
        // Corrupt entry — clear it and keep looking rather than crash on boot
        store.removeItem('fute_user');
        store.removeItem('fute_token');
      }
    }
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, email, role, full_name, department }
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      setLoading(false);
      return;
    }
    setUser(session.user);
    setToken(session.token);
    setLoading(false);
  }, []);

  // Best-effort refresh: a founder/super admin may have changed this user's
  // role/permissionOverrides since they last logged in (or 15s ago), and the
  // cached copy in storage can't know that on its own. Never blocks
  // rendering, and silently keeps the current session on any failure
  // (offline, no backend configured) — same tolerance the login flow already
  // had when this only ran once on mount.
  const refreshSelf = useCallback(() => {
    const session = readSession();
    if (!session) return;
    const store = localStorage.getItem('fute_user') ? localStorage : sessionStorage;
    getMe()
      .then(({ data }) => {
        const empId = data.employee_id || data.employeeId || session.user.employee_id || session.user.employeeId || '';
        const freshUser = {
          ...session.user,
          ...data,
          employee_id: empId,
          employeeId: empId,
        };
        setUser(freshUser);
        store.setItem('fute_user', JSON.stringify(freshUser));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (token) refreshSelf();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fire on
    // a real login/logout, not on every refreshSelf re-creation
  }, [token]);

  useVisibilityAwarePolling(refreshSelf, POLL_MS, Boolean(token));

  function login(userData, jwt, remember = true) {
    const empId = userData.employee_id || userData.employeeId || '';
    const updatedUser = {
      ...userData,
      employee_id: empId,
      employeeId: empId,
    };
    setUser(updatedUser);
    setToken(jwt);

    // One-shot signal for RequireAuth to show the welcome intro on the very
    // next protected route it renders, then clear itself — always in
    // sessionStorage (independent of the remember-me store choice below)
    // since it should fire once per actual sign-in, not persist across
    // browser restarts the way a "remember me" session does.
    sessionStorage.setItem('fute_just_logged_in', '1');

    // Clear the other store first — otherwise a stale copy from a previous
    // "remember me" choice can outlive this one.
    const store = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    other.removeItem('fute_user');
    other.removeItem('fute_token');
    store.setItem('fute_user', JSON.stringify(updatedUser));
    store.setItem('fute_token', jwt);
  }

  function logout() {
    // Revoke server-side first (while the token's still in storage for the
    // request interceptor to attach) so a copied/leaked token can't keep
    // working after the user clicks Logout — best-effort, since the user is
    // leaving either way and shouldn't be blocked by a flaky network.
    logoutUser().catch(() => {});
    setUser(null);
    setToken(null);
    localStorage.removeItem('fute_user');
    localStorage.removeItem('fute_token');
    sessionStorage.removeItem('fute_user');
    sessionStorage.removeItem('fute_token');
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
