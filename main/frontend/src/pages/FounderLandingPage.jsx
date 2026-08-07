import { useNavigate } from 'react-router-dom';
import { TrendingUp, Code2, Factory, Megaphone, Palette, ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_DEPARTMENTS = [
  { id: 'sales', label: 'Sales', icon: TrendingUp },
  { id: 'developers', label: 'Developer', icon: Code2 },
  { id: 'production', label: 'Production', icon: Factory },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'branding', label: 'Branding', icon: Palette },
];

export default function FounderLandingPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function goToDept(deptId) {
    navigate('/founder/dashboard', { state: { activeDept: deptId } });
  }

  function handleSignOut() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen w-full bg-[#0b0b0d] text-white relative overflow-hidden font-sans">
      {/* Ambient branding glow, matching AuthLayout's motif */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,_rgba(245,158,11,0.18)_0%,_rgba(232,96,36,0.08)_35%,_transparent_75%)] pointer-events-none" />
      <div className="absolute right-[8%] top-[15%] w-[420px] h-[420px] bg-amber-500/15 rounded-full blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute left-[5%] bottom-[10%] w-[360px] h-[360px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-orange-500/20 border border-white/20">
            F
          </div>
          <span className="text-sm font-black tracking-tight text-white">Fute Services</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5">
          {NAV_DEPARTMENTS.map((dept) => {
            const Icon = dept.icon;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => goToDept(dept.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer"
              >
                <Icon size={14} />
                <span>{dept.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/founder/dashboard')}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </nav>

      {/* Mobile department nav */}
      <div className="md:hidden relative z-10 flex items-center gap-2 px-6 py-3 overflow-x-auto border-b border-white/5">
        {NAV_DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => goToDept(dept.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-gray-300 bg-white/5 border border-white/10 whitespace-nowrap cursor-pointer"
            >
              <Icon size={12} />
              <span>{dept.label}</span>
            </button>
          );
        })}
      </div>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-24 sm:py-32 max-w-3xl mx-auto">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e86024] mb-4">
          Executive Command Center
        </span>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
          Welcome back, {user?.full_name?.split(' ')[0] || 'Founder'}
        </h1>
        <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-10 max-w-xl">
          One unified command center for every department — approvals, projects, reports, and people, all under a single governance layer.
        </p>

        <button
          type="button"
          onClick={() => navigate('/founder/dashboard')}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-black shadow-xl shadow-orange-500/25 border border-white/20 hover:shadow-orange-500/40 hover:scale-[1.02] transition-all cursor-pointer"
        >
          Enter Dashboard
          <ArrowRight size={16} />
        </button>

        {/* Department quick-cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-16 w-full">
          {NAV_DEPARTMENTS.map((dept) => {
            const Icon = dept.icon;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => goToDept(dept.id)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#141418] border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 group-hover:text-[#e86024] group-hover:border-[#e86024]/30 transition-all">
                  <Icon size={18} />
                </div>
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors">{dept.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
