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
    <div className="min-h-screen w-full bg-background text-foreground relative overflow-hidden font-sans">
      {/* Ambient branding glow, matching AuthLayout's motif */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,_rgba(245,158,11,0.18)_0%,_rgba(232,96,36,0.08)_35%,_transparent_75%)] pointer-events-none" />
      <div className="absolute right-[8%] top-[15%] w-[420px] h-[420px] bg-warning/15 rounded-full blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute left-[5%] bottom-[10%] w-[360px] h-[360px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-foreground text-sm font-semibold shadow border border-border">
            F
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">Fute Services</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5">
          {NAV_DEPARTMENTS.map((dept) => {
            const Icon = dept.icon;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => goToDept(dept.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-muted-foreground/40 transition-all cursor-pointer"
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
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-muted border border-border text-foreground hover:bg-accent transition-all cursor-pointer"
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-9 h-9 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-center transition-all cursor-pointer"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </nav>

      {/* Mobile department nav */}
      <div className="md:hidden relative z-10 flex items-center gap-2 px-6 py-3 overflow-x-auto border-b border-border">
        {NAV_DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => goToDept(dept.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground bg-muted border border-border whitespace-nowrap cursor-pointer"
            >
              <Icon size={12} />
              <span>{dept.label}</span>
            </button>
          );
        })}
      </div>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-24 sm:py-32 max-w-3xl mx-auto">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary mb-4">
          Executive Command Center
        </span>
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-tight mb-4">
          Welcome back, {user?.full_name?.split(' ')[0] || 'Founder'}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-10 max-w-xl">
          One unified command center for every department — approvals, projects, reports, and people, all under a single governance layer.
        </p>

        <button
          type="button"
          onClick={() => navigate('/founder/dashboard')}
          className="flex items-center gap-2 px-6 py-3.5 rounded-lg bg-primary text-foreground text-sm font-semibold shadow border border-border hover:shadow hover:scale-[1.02] transition-all cursor-pointer"
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
                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card border border-border hover:border-muted-foreground/40 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/30 transition-all">
                  <Icon size={18} />
                </div>
                <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">{dept.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
