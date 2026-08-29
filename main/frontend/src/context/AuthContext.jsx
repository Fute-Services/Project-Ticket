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

// The session itself now lives entirely in an httpOnly cookie (see
// authController.js) — invisible to this JS, by design. This cache is just a
// cosmetic optimization so a page refresh doesn't flash the login screen
// before GET /api/auth/me resolves; it's never trusted on its own, only ever
// used to pre-paint while that request is in flight below.
function readCachedUser() {
  const stored = sessionStorage.getItem('fute_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    sessionStorage.removeItem('fute_user');
    return null;
  }
}

function cacheUser(user) {
  sessionStorage.setItem('fute_user', JSON.stringify(user));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readCachedUser); // { id, email, role, full_name, department }
  const [loading, setLoading] = useState(true);

  // The only real source of truth for "am I logged in" — the cookie is
  // invisible to JS, so this is the one way to ask. A 401 here means the
  // cookie is missing/expired/revoked, which really does mean logged out.
  // Any other failure (offline, a flaky request) leaves whatever session
  // state we already have alone rather than bouncing someone to the login
  // screen over a network hiccup.
  const refreshSelf = useCallback(() => {
    return getMe()
      .then(({ data }) => {
        const empId = data.employee_id || data.employeeId || '';
        const freshUser = { ...data, employee_id: empId, employeeId: empId };
        setUser(freshUser);
        cacheUser(freshUser);
      })
      .catch((e) => {
        if (e.response?.status === 401) {
          setUser(null);
          sessionStorage.removeItem('fute_user');
        }
      });
  }, []);

  useEffect(() => {
    refreshSelf().finally(() => setLoading(false));
  }, [refreshSelf]);

  useVisibilityAwarePolling(refreshSelf, POLL_MS, Boolean(user));

  function login(userData) {
    const empId = userData.employee_id || userData.employeeId || '';
    const updatedUser = {
      ...userData,
      employee_id: empId,
      employeeId: empId,
    };
    setUser(updatedUser);
    cacheUser(updatedUser);

    // One-shot signal for RequireAuth to show the welcome intro on the very
    // next protected route it renders, then clear itself.
    sessionStorage.setItem('fute_just_logged_in', '1');
  }

  function logout() {
    // Revoke server-side and clear the cookie — best-effort, since the user
    // is leaving either way and shouldn't be blocked by a flaky network.
    logoutUser().catch(() => {});
    setUser(null);
    sessionStorage.removeItem('fute_user');
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
