import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Where each role lands after signing in (PRD §4.1 — one login UI, role-based routing)
export const HOME_FOR_ROLE = {
  founder: '/founder/dashboard',
  hr: '/hr/dashboard',
  it: '/it/dashboard',
  employee: '/employee/dashboard',
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
    if (session) {
      setUser(session.user);
      setToken(session.token);
    }
    setLoading(false);
  }, []);

  function login(userData, jwt, remember = true) {
    setUser(userData);
    setToken(jwt);

    // Clear the other store first — otherwise a stale copy from a previous
    // "remember me" choice can outlive this one.
    const store = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    other.removeItem('fute_user');
    other.removeItem('fute_token');
    store.setItem('fute_user', JSON.stringify(userData));
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
