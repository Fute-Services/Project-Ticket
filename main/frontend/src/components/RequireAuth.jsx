import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard. AuthContext restores the session from localStorage inside an
 * effect, so `user` is null on the very first render even for a signed-in
 * person — redirecting before `loading` clears would sign them out on every
 * refresh. Render nothing until we actually know.
 */
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
