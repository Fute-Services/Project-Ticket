import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { useTickets } from '../../context/TicketContext';
import { useHrDesk } from '../../context/HrDeskContext';
import { useHrNotifications } from '../../hooks/useHrNotifications';
import {
  Users2,
  LayoutGrid,
  UserSearch,
  CalendarClock,
  Clock as ClockIcon,
  Mail,
  Contact,
  BarChart2,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  ArrowRight,
  ChevronsLeft,
  ChevronsRight,
  Ticket,
  CheckSquare,
} from 'lucide-react';
const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutGrid, path: '/hr/overview' },
  { label: 'Tickets Queue', icon: Ticket, path: '/hr/tickets' },
  { label: 'Approval Center', icon: CheckSquare, path: '/hr/approvals' },
  { label: 'Directory', icon: Contact, path: '/hr/directory' },
  { label: 'Candidates', icon: UserSearch, path: '/hr/candidates' },
  { label: 'Interviews', icon: CalendarClock, path: '/hr/interviews' },
  { label: 'Attendance', icon: ClockIcon, path: '/hr/attendance' },
  { label: 'Email', icon: Mail, path: '/hr/email' },
  { label: 'Reports', icon: BarChart2, path: '/hr/reports' },
];

function buildSearchIndex({ employees, candidates, interviews, tickets }) {
  return [
    ...candidates.map((c) => ({ group: 'Candidates', label: c.name, sub: c.appliedFor, path: '/hr/candidates' })),
    ...employees.map((e) => ({ group: 'Employees', label: e.name, sub: e.designation, path: '/hr/directory' })),
    ...interviews.map((i) => ({ group: 'Interviews', label: `${i.candidate} - ${i.type}`, sub: `${i.date} ${i.time}`, path: '/hr/interviews' })),
    ...tickets.map((t) => ({ group: 'Tickets', label: t.token || t.title, sub: t.title, path: '/hr/tickets' })),
  ];
}

const ROLE_LABEL = { founder: 'Founder', hr: 'HR Manager', it: 'IT Support', employee: 'Employee' };

export default function HrLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [query, setQuery] = useState('');
  const { employees, candidates, interviews } = useHrDesk();
  const { tickets } = useTickets();

  const searchIndex = useMemo(
    () => buildSearchIndex({ employees, candidates, interviews, tickets }),
    [employees, candidates, interviews, tickets]
  );
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return searchIndex.filter((r) => r.label.toLowerCase().includes(q) || r.sub?.toLowerCase().includes(q)).slice(0, 8);
  }, [query, searchIndex]);

  function handleSignOut() {
    logout();
    navigate('/', { replace: true });
  }

  function goTo(path) {
    navigate(path);
    setQuery('');
    setMobileNavOpen(false);
  }

  // Real, live events (ticket/leave/approval activity) - see useHrNotifications
  // for what counts as "unread" and why. Shared with Overview.jsx's
  // Notifications stat card so both show the exact same live count.
  const notifications = useHrNotifications();
  const unreadCount = notifications.length;

  const { canAccess } = usePermissions();
  const navItems = NAV_ITEMS.filter((item) => canAccess('hr', item.path));
  const currentNavLabel = navItems.find((item) => item.path === location.pathname)?.label || 'Dashboard';

  // A permission revoked while the user is sitting on that exact page
  // shouldn't leave them stuck on a page that's no longer in their nav.
  useEffect(() => {
    if (navItems.length && !navItems.some((item) => item.path === location.pathname)) {
      navigate(navItems[0].path, { replace: true });
    }
  }, [navItems, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-[#090f0c] text-foreground flex font-sans selection:bg-primary/30 selection:text-primary p-2.5 lg:p-3 gap-3 overflow-x-hidden">
      {/* Sidebar - Fixed Height with Zero Scrollbar (Preserved) */}
      <aside
        className={`fixed lg:sticky top-3 left-3 lg:left-auto z-40 ${
          collapsed ? 'w-[195px] lg:w-[64px]' : 'w-[195px] xl:w-[200px]'
        } h-[calc(100vh-1.5rem)] sidebar-glass rounded-2xl flex flex-col justify-between shrink-0 p-3 overflow-hidden transition-all duration-300 lg:translate-x-0 shadow-2xl text-white ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          {!collapsed && (
            <div className="px-3 py-2 mb-3 border-b border-white/10">
              <div className="font-bold text-sm tracking-tight text-white leading-none">
                HR Dashboard
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => goTo(item.path)}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`mx-1 flex items-center py-2 px-2.5 rounded-lg text-[11px] font-mono font-bold tracking-wider uppercase transition-all duration-200 text-left cursor-pointer ${
                    collapsed ? 'lg:justify-center lg:px-0 gap-2.5' : 'gap-2.5'
                  } ${
                    isActive
                      ? 'bg-white/[0.14] text-white shadow-sm border border-white/20 font-semibold backdrop-blur-md'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.07] border border-transparent'
                  }`}
                >
                  <Icon size={15} className={`shrink-0 ${isActive ? 'text-emerald-400' : 'text-white/60'}`} />
                  <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile Footer */}
        <div className="flex flex-col gap-2 pt-3 border-t border-white/10">
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
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-xs text-emerald-300">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'H'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0c1611]" />
                </div>
                <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
                  <div className="text-xs font-semibold text-white truncate">{user?.full_name || 'HR Manager'}</div>
                  <div className="text-[10px] text-white/50 truncate">{ROLE_LABEL[user?.role] || 'HR Manager'}</div>
                </div>
              </div>
              <ChevronDown size={14} className={`text-white/60 shrink-0 ${collapsed ? 'lg:hidden' : ''}`} />
            </button>

            {showProfileMenu && (
              <div className="absolute bottom-full left-0 min-w-[135px] mb-2 bg-[#0e1a14]/95 backdrop-blur-xl border border-white/15 rounded-xl p-1.5 shadow-2xl z-50">
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
      
      <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-1.5rem)] bg-[#eaf3ec] rounded-[24px] lg:rounded-[28px] border border-white/10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
        <header className="h-14 border-b border-border/70 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-[#eaf3ec]/85 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-xl bg-muted border border-border text-muted-foreground cursor-pointer shrink-0"
            >
              <Menu size={16} />
            </button>

            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium shrink-0 mr-1">
              <span>HR</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{currentNavLabel}</span>
            </div>

            <div className="relative flex-1 max-w-[360px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search employees, candidates, tickets..."
                className="h-9 bg-muted/60 hover:bg-muted focus:bg-white border border-border/80 rounded-full pl-9 pr-4 text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full transition-all"
              />
              {results.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-border rounded-2xl shadow-xl overflow-hidden z-30">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goTo(r.path)}
                      className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/60 last:border-0"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate">{r.label}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{r.sub}</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border shrink-0 ml-2">
                        {r.group}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifs((p) => !p)}
                aria-label="Open notifications"
                className="relative w-9 h-9 rounded-full bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-primary-foreground text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute top-full right-0 mt-2 w-[300px] bg-white border border-border rounded-2xl shadow-xl overflow-hidden z-30">
                  <div className="px-4 py-2.5 border-b border-border/60 text-xs font-bold text-foreground">Notifications</div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-[11px] text-muted-foreground">All caught up - nothing pending.</div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            goTo(n.path);
                            setShowNotifs(false);
                          }}
                          className="w-full text-left px-4 py-2.5 border-b border-border/60 last:border-0 hover:bg-muted/40 cursor-pointer"
                        >
                          <div className="flex items-start gap-2">
                            {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                            <div className={n.unread ? '' : 'pl-3.5'}>
                              <div className="text-[11px] text-foreground">{n.text}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{n.time}</div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => goTo('/hr/email')}
              aria-label="Open email inbox"
              title="Email inbox"
              className="relative w-9 h-9 rounded-full bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center cursor-pointer shrink-0"
            >
              <Mail size={15} />
            </button>

            <div className="h-9 flex items-center gap-2 px-2.5 rounded-full bg-muted/60 border border-border shrink-0">
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-[10px] text-primary">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'H'}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-[11px] font-semibold text-foreground leading-none">{user?.full_name || 'HR Manager'}</span>
                <span className="text-[9px] text-muted-foreground">{ROLE_LABEL[user?.role] || 'HR'}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3.5 lg:p-5 min-w-0 overflow-y-auto flex flex-col">{children}</main>
      </div>
    </div>
  );
}
