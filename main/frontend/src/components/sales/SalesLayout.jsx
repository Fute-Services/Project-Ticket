import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSalesDesk } from '../../context/SalesDeskContext';
import {
  LayoutGrid, Contact, PhoneCall, Clock, CalendarDays, TrendingUp,
  Megaphone, BarChart2, Settings as SettingsIcon, LogOut, ChevronDown, Menu,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutGrid, path: '/sales/overview' },
  { label: 'Leads', icon: Contact, path: '/sales/directory' },
  { label: 'Daily Calls', icon: PhoneCall, path: '/sales/daily-calls' },
  { label: 'Follow-ups', icon: Clock, path: '/sales/follow-ups', badgeKey: 'followUpCount' },
  { label: 'Meetings', icon: CalendarDays, path: '/sales/meetings' },
  { label: 'Pipeline', icon: TrendingUp, path: '/sales/pipeline' },
  { label: 'Campaigns', icon: Megaphone, path: '/sales/campaigns' },
  { label: 'Reports', icon: BarChart2, path: '/sales/reports' },
  { label: 'Settings', icon: SettingsIcon, path: '/sales/settings' },
];

// Deliberately lighter than HrLayout — no permission-override gating, no
// notifications bell, no global search. Sales is a single flat role; that
// machinery earns its keep on HR's much larger surface, not here.
export default function SalesLayout({ children }) {
  const { user, logout } = useAuth();
  const { followUpCount } = useSalesDesk();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  function handleSignOut() {
    logout();
    navigate('/', { replace: true });
  }

  function goTo(path) {
    navigate(path);
    setMobileNavOpen(false);
  }

  const currentNavLabel = NAV_ITEMS.find((item) => item.path === location.pathname)?.label || 'Dashboard';
  const badgeValues = { followUpCount };

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary/30 selection:text-primary">
      <aside
        className={`fixed lg:sticky top-3 left-3 lg:left-auto lg:ml-3 z-40 w-[195px] h-[calc(100vh-1.5rem)] bg-background border border-border rounded-lg flex flex-col justify-between shrink-0 p-3 overflow-hidden transition-transform duration-300 lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="min-h-0 overflow-y-auto">
          <div className="px-3 py-2 mb-3 border-b border-border">
            <div className="font-bold text-sm tracking-tight text-foreground leading-none">Sales Desk</div>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const badgeValue = item.badgeKey ? badgeValues[item.badgeKey] : 0;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => goTo(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`mx-1 flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all duration-200 text-left cursor-pointer ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow border border-primary/40 font-semibold'
                      : 'bg-muted text-muted-foreground border border-border hover:border-muted-foreground/40 hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon size={14} className={`shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  <span className="truncate flex-1">{item.label}</span>
                  {badgeValue > 0 && (
                    <span className={`shrink-0 text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 ${
                      isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-destructive text-destructive-foreground'
                    }`}>
                      {badgeValue}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-3 border-t border-border relative shrink-0">
          <button
            type="button"
            onClick={() => setShowProfileMenu((p) => !p)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-muted border border-border hover:border-muted-foreground/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-xs text-primary">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary border-2 border-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-foreground truncate">{user?.full_name || 'Sales'}</div>
                <div className="text-[10px] text-muted-foreground truncate">{user?.role === 'founder' ? 'Founder' : 'Sales'}</div>
              </div>
            </div>
            <ChevronDown size={14} className="text-muted-foreground shrink-0" />
          </button>
          {showProfileMenu && (
            <div className="absolute bottom-full left-0 min-w-[135px] mb-2 bg-muted border border-border rounded-xl p-1.5 shadow-2xl z-50">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors text-left cursor-pointer whitespace-nowrap"
              >
                <LogOut size={14} className="shrink-0" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 bg-background/80 z-30 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-screen max-h-screen overflow-hidden">
        <header className="h-14 border border-border/60 rounded-xl mx-3 mt-3 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-card/60 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10)] sticky top-3 z-20">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-xl bg-muted backdrop-blur-md border border-border text-muted-foreground cursor-pointer shrink-0"
            >
              <Menu size={16} />
            </button>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium shrink-0">
              <span>Sales</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{currentNavLabel}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 lg:p-4 min-w-0 overflow-y-auto flex flex-col h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
