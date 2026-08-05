import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

function getNavItems(role) {
  const items = [];
  if (role === 'founder') items.push({ label: 'Founder Dashboard', to: '/founder/dashboard' });
  else if (role === 'hr') items.push({ label: 'HR Dashboard', to: '/hr/dashboard' });
  else if (role === 'it') items.push({ label: 'IT Dashboard', to: '/it/dashboard' });
  else items.push({ label: 'My Tickets', to: '/employee/dashboard' });

  if (role !== 'hr') items.push({ label: 'Raise HR Ticket', to: '/employee/complaint/hr' });
  if (role !== 'it') items.push({ label: 'Raise IT Ticket', to: '/employee/complaint/it' });
  items.push({ label: 'Track a Ticket', to: '/search' });
  return items;
}

// Dark pill-style sidebar nav, visible on md+ screens (Navbar covers mobile)
export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const items = getNavItems(user.role);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <aside className="hidden md:block w-64 shrink-0 p-4">
      <div className="surface elev-2 sticky top-4 rounded-[2rem] p-3 flex flex-col gap-2">
        <div className="px-3 py-3 mb-1 flex items-center justify-between">
          <span className="text-lg font-black gradient-text tracking-tight font-mono">FUTE</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-mono font-bold uppercase">
            {user.role}
          </span>
        </div>

        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-4 py-3 rounded-full text-[11px] font-bold uppercase tracking-wider font-mono transition ${
                isActive
                  ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)]'
                  : 'bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white/80'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}

        <div className="h-px bg-white/10 my-2 mx-2" />

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-3 rounded-full text-[11px] font-bold uppercase tracking-wider font-mono text-white/40 hover:text-red-400 hover:bg-red-500/10 transition"
        >
          <LogOut size={13} /> Logout
        </button>
      </div>
    </aside>
  );
}
