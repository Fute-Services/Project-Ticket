import { Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';
import { Skeleton } from './ui/skeleton';

/**
 * Shown while the session is being restored. A dashboard-shaped skeleton
 * rather than a spinner: it keeps the page from flashing empty and hints at
 * what's about to appear.
 */
export function AppSkeleton() {
  return (
    <div className="min-h-screen bg-background flex" aria-busy="true" aria-label="Loading">
      <div className="hidden lg:block w-[200px] shrink-0 p-3">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
      <div className="flex-1 p-4 flex flex-col gap-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Route guard. AuthContext restores the session from localStorage inside an
 * effect, so `user` is null on the very first render even for a signed-in
 * person — redirecting before `loading` clears would sign them out on every
 * refresh. Show a skeleton until we actually know.
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

  if (loading) return <AppSkeleton />;
  if (!user) return <Navigate to="/" replace />;
  if (allow && !allow.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }
  return children;
}
