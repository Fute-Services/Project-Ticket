import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSalesDesk } from '../../context/SalesDeskContext';
import {
  LayoutGrid, Contact, PhoneCall, Clock, CalendarDays, TrendingUp,
  Megaphone, BarChart2, Settings as SettingsIcon, LogOut, ChevronDown, Menu,
  ChevronsLeft, ChevronsRight,
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

// Deliberately lighter than HrLayout - no permission-override gating, no
// notifications bell, no global search. Sales is a single flat role; that
// machinery earns its keep on HR's much larger surface, not here.
export default function SalesLayout({ children }) {
  const { user, logout } = useAuth();
  const { followUpCount } = useSalesDesk();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
    <div className="min-h-screen bg-[#0F090A] text-foreground flex font-sans selection:bg-primary/30 selection:text-primary p-2.5 lg:p-3 gap-3 overflow-x-hidden">
      <aside
        className={`fixed lg:sticky top-3 left-3 lg:left-auto z-40 h-[calc(100vh-1.5rem)] sidebar-glass rounded-2xl flex flex-col justify-between shrink-0 p-3 overflow-hidden transition-all duration-300 shadow-2xl text-white ${
          collapsed ? 'lg:w-[76px]' : 'lg:w-[195px]'
        } ${mobileNavOpen ? 'translate-x-0 w-[195px]' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="min-h-0 overflow-y-auto">
          <div className="px-2 py-2 mb-3 border-b border-white/10 flex items-center justify-between">
            <div className={`font-bold text-sm tracking-tight text-white leading-none ${collapsed ? 'lg:hidden' : ''}`}>
              Sales Desk
            </div>
            {collapsed && (
              <div className="hidden lg:block mx-auto font-bold text-sm text-rose-500">
                SD
              </div>
            )}
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
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center rounded-lg text-[11px] font-mono font-bold tracking-wider uppercase transition-all duration-200 text-left cursor-pointer ${
                    collapsed
                      ? 'lg:justify-center lg:p-2 p-2.5 gap-2.5 mx-0'
                      : 'gap-2.5 py-2 px-2.5 mx-1'
                  } ${
                    isActive
                      ? 'bg-white/[0.14] text-white shadow-sm border border-white/20 font-semibold backdrop-blur-md'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.07] border border-transparent'
                  }`}
                >
                  <Icon size={15} className={`shrink-0 ${isActive ? 'text-rose-500' : 'text-white/60'}`} />
                  <span className={`truncate flex-1 ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                  {badgeValue > 0 && (
                    <span className={`shrink-0 text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 bg-rose-500 text-black shadow-[0_0_8px_rgba(244, 63, 94,0.5)] ${collapsed ? 'lg:hidden' : ''}`}>
                      {badgeValue}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-2 pt-3 border-t border-white/10 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((p) => !p)}
              title={collapsed ? user?.full_name || 'Account' : undefined}
              className={`w-full flex items-center rounded-lg bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 transition-colors text-left cursor-pointer text-white ${
                collapsed ? 'lg:justify-center lg:p-1.5 justify-between p-2.5' : 'justify-between p-2.5'
              }`}
            >
              <div className={`flex items-center min-w-0 ${collapsed ? 'lg:justify-center gap-2.5' : 'gap-2.5'}`}>
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-rose-600/20 border border-rose-600/40 flex items-center justify-center font-bold text-xs text-rose-300">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#160C0E]" />
                </div>
                <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
                  <div className="text-xs font-semibold text-white truncate">{user?.full_name || 'Sales'}</div>
                  <div className="text-[10px] text-white/50 truncate">{user?.role === 'founder' ? 'Founder' : 'Sales'}</div>
                </div>
              </div>
              <ChevronDown size={14} className={`text-white/60 shrink-0 ${collapsed ? 'lg:hidden' : ''}`} />
            </button>
            {showProfileMenu && (
              <div className="absolute bottom-full left-0 min-w-[135px] mb-2 bg-[#1A0E10]/95 backdrop-blur-xl border border-white/15 rounded-xl p-1.5 shadow-2xl z-50">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left cursor-pointer whitespace-nowrap"
                >
                  <LogOut size={14} className="shrink-0" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>

          {/* Collapse Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-full p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white flex items-center justify-center gap-2 text-xs font-medium transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!collapsed && <span>Collapse Menu</span>}
          </button>
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 bg-background/80 z-30 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* Main Workspace - Framed Rounded Tablet Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-1.5rem)] bg-[#f5e9ea] rounded-[24px] lg:rounded-[28px] border border-white/10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
        <header className="h-14 border-b border-border/70 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-[#f5e9ea]/85 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-xl bg-muted border border-border text-muted-foreground cursor-pointer shrink-0"
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

        <main className="flex-1 p-3.5 lg:p-5 min-w-0 overflow-y-auto flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
