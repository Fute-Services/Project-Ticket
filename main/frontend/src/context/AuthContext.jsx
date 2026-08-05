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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, email, role, full_name, department }
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('fute_user');
    const storedToken = localStorage.getItem('fute_token');
    if (stored && storedToken) {
      try {
        setUser(JSON.parse(stored));
        setToken(storedToken);
      } catch {
        // Corrupt entry — start clean rather than crashing on boot
        localStorage.removeItem('fute_user');
        localStorage.removeItem('fute_token');
      }
    }
    setLoading(false);
  }, []);

  function login(userData, jwt) {
    setUser(userData);
    setToken(jwt);
    localStorage.setItem('fute_user', JSON.stringify(userData));
    localStorage.setItem('fute_token', jwt);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('fute_user');
    localStorage.removeItem('fute_token');
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
