import { TrendingUp, Code2, Megaphone, Palette, Factory, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FounderDeptView from '../components/FounderDeptView';
import ThemeToggle from '../components/ThemeToggle';

/**
 * Standalone dashboard for the five departments that only ever existed as a
 * read-only view inside the Founder's dashboard (data/deptDemoData.js — Sales,
 * Developers, Marketing, Branding, Production). This page reuses that exact
 * same content and renderer rather than inventing new data, so it can't drift
 * from what the Founder already sees when browsing these departments.
 *
 * There's still no backend or workflow behind any of them — this just makes
 * that existing demo view reachable by its own login, not a new department.
 */
const DEPTS = {
  sales: { id: 'sales', label: 'Sales Operations', icon: TrendingUp },
  developers: { id: 'developers', label: 'Developer Portal', icon: Code2 },
  marketing: { id: 'marketing', label: 'Marketing Suite', icon: Megaphone },
  branding: { id: 'branding', label: 'Branding Hub', icon: Palette },
  production: { id: 'production', label: 'Production Floor', icon: Factory },
};

export default function DepartmentDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dept = DEPTS[user?.role] || DEPTS.sales;

  function handleSignOut() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-xl px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <span>{dept.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className="!w-8 !h-8" />
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'D'}
            </div>
            <span className="hidden sm:block text-xs font-semibold text-muted-foreground">{user?.full_name}</span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="w-8 h-8 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 flex items-center justify-center transition-colors cursor-pointer"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 sm:p-6">
        <FounderDeptView dept={dept} />
      </main>
    </div>
  );
}
