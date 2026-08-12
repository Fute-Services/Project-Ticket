import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../utils/api';

const AuthContext = createContext(null);

// Where each role lands after signing in (PRD §4.1 — one login UI, role-based routing)
export const HOME_FOR_ROLE = {
  founder: '/founder/dashboard',
  superadmin: '/superadmin/dashboard',
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

    // Best-effort refresh: a founder may have changed this user's role/
    // permissionOverrides since they last logged in, and the cached copy in
    // storage can't know that on its own. Never blocks the initial render,
    // and silently keeps the cached session on any failure (offline, no
    // backend configured) — same tolerance the login flow already has.
    const store = localStorage.getItem('fute_user') ? localStorage : sessionStorage;
    function persist(freshUser) {
      setUser(freshUser);
      store.setItem('fute_user', JSON.stringify(freshUser));
    }

    getMe()
      .then(({ data }) => {
        const empId = data.employee_id || data.employeeId || session.user.employee_id || session.user.employeeId || '';
        persist({
          ...session.user,
          ...data,
          employee_id: empId,
          employeeId: empId,
        });
      })
      .catch(() => {});
  }, []);

  function login(userData, jwt, remember = true) {
    const empId = userData.employee_id || userData.employeeId || '';
    const updatedUser = {
      ...userData,
      employee_id: empId,
      employeeId: empId,
    };
    setUser(updatedUser);
    setToken(jwt);

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
