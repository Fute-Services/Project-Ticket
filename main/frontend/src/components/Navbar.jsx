import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Search, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  function getDashboardLink() {
    if (!user) return '/';
    if (user.role === 'founder') return '/founder/dashboard';
    if (user.role === 'hr') return '/hr/dashboard';
    if (user.role === 'it') return '/it/dashboard';
    return '/employee/dashboard';
  }

  return (
    <nav className="surface elev-2 sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <span className="text-xl font-black gradient-text tracking-tight">FUTE</span>
        <span className="text-xs text-white/30 font-medium hidden sm:block">Portal</span>
      </Link>

      {user && (
        <div className="flex items-center gap-3">
          <Link to="/search" className="p-2 rounded-lg hover:bg-white/5 transition text-white/60 hover:text-white">
            <Search size={16} />
          </Link>
          <Link to={getDashboardLink()} className="p-2 rounded-lg hover:bg-white/5 transition text-white/60 hover:text-white">
            <LayoutDashboard size={16} />
          </Link>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-sm">
            <span className="text-white/50">Hi,</span>
            <span className="text-white font-medium">{user.full_name?.split(' ')[0]}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-500 font-semibold uppercase">
              {user.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-red-500/10 transition text-white/40 hover:text-red-400"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </nav>
  );
}
