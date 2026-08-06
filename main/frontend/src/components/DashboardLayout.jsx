import { Link, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';

const ROLE_LABEL = {
  founder: 'Founder',
  hr: 'HR',
  it: 'IT',
  employee: 'Employee',
};

/**
 * Shell for every signed-in screen: sidebar on the left, content on the right.
 *
 * The logo mark is --ink here rather than --acc. The queue's red belongs to P1
 * priority — if two things on a screen are red, neither is urgent.
 */
export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    logout();
    navigate('/login', { replace: true });
  }

  const nav = (
    <nav className="flex lg:flex-col gap-1">
      <Link
        to={homeFor(user?.role)}
        aria-current="page"
        className="no-underline text-ink text-sm font-heading font-extrabold px-3 py-2 border-l-2 border-line bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
      >
        Dashboard
      </Link>
    </nav>
  );

  const identity = (
    <div className="min-w-0">
      <div className="kicker">{ROLE_LABEL[user?.role] || 'Employee'}</div>
      <div className="text-sm font-heading font-extrabold truncate">
        {user?.full_name || 'Signed in'}
      </div>
      <div className="text-[12px] text-mut truncate">{user?.email}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[232px_1fr]">
      {/* Sidebar — becomes a top bar under lg, where a fixed column would eat
          most of the width */}
      <aside className="bg-sf border-b-2 lg:border-b-0 lg:border-r-2 border-line flex flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="w-[26px] h-[26px] bg-ink block shrink-0" />
          <span className="font-heading font-extrabold text-[15px]">Fute Services</span>
        </div>

        <div className="px-3 pb-4 lg:pb-0">{nav}</div>

        <div className="mt-auto border-t-2 border-line px-5 py-4 flex items-center justify-between gap-3">
          {identity}
          <button type="button" onClick={handleSignOut} className="btn btn-ghost shrink-0">
            Sign out
          </button>
        </div>
      </aside>

      <main className="px-6 sm:px-10 py-9 min-w-0">{children}</main>
    </div>
  );
}
