import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';
import { Skeleton } from './ui/skeleton';

// Lazy so its `framer-motion` import doesn't ride along in the main bundle
// that every page (including the login screen, before anyone's signed in)
// has to download - RequireAuth itself is imported eagerly in App.jsx.
const WelcomeIntro = lazy(() => import('./WelcomeIntro'));

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
 * person - redirecting before `loading` clears would sign them out on every
 * refresh. Show a skeleton until we actually know.
 *
 * `allow` is the list of roles permitted on this route. Omit it for routes
 * everyone logged-in may reach; pass it to scope a route to specific roles.
 * Strict separation - each role (Founder included) only reaches its own
 * area, no cross-department access. Anyone not permitted gets bounced to
 * their own home rather than the login page, since they *are* signed in -
 * just not into this area.
 */
export default function RequireAuth({ children, allow }) {
  const { user, loading } = useAuth();
  // The dashboard this renders (`children`) is always a lazy-loaded route
  // component, so on its first-ever navigation React suspends here while
  // the chunk downloads - which discards this render attempt and retries
  // once it's ready. A lazy useState initializer runs on *every* attempt,
  // discarded or not, so clearing the flag there consumed it on the
  // throwaway attempt and the real, committed render always found it
  // already gone. Reading is idempotent (safe to repeat across attempts);
  // only the effect below - which React guarantees runs solely after a
  // real commit - actually clears it, exactly once.
  const [showIntro, setShowIntro] = useState(() => sessionStorage.getItem('fute_just_logged_in') === '1');

  useEffect(() => {
    if (showIntro) sessionStorage.removeItem('fute_just_logged_in');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <AppSkeleton />;
  if (!user) return <Navigate to="/" replace />;
  if (allow && !allow.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }
  return (
    <>
      {children}
      {showIntro && (
        <Suspense fallback={null}>
          <WelcomeIntro name={user.full_name} onDone={() => setShowIntro(false)} />
        </Suspense>
      )}
    </>
  );
}
