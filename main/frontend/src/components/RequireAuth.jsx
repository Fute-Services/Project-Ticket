import { Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';

/**
 * Route guard. AuthContext restores the session from localStorage inside an
 * effect, so `user` is null on the very first render even for a signed-in
 * person — redirecting before `loading` clears would sign them out on every
 * refresh. Render nothing until we actually know.
 *
 * `allow` is the list of roles permitted on this route. Omit it for routes
 * everyone logged-in may reach; pass it to scope a route to specific roles.
 * Strict separation — each role (Founder included) only reaches its own
 * area, no cross-department access. Anyone not permitted gets bounced to
 * their own home rather than the login page, since they *are* signed in —
 * just not into this area.
 */
export default function RequireAuth({ children, allow }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (allow && !allow.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }
  return children;
}
