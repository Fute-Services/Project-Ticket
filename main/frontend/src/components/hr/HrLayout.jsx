import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { useTickets } from '../../context/TicketContext';
import { useLeave, isFounderApproval } from '../../context/LeaveContext';
import { useHrDesk } from '../../context/HrDeskContext';
import { relativeTime } from '../../utils/tickets';
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
  Calendar,
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
const DATE_RANGES = ['Today', 'This Week', 'This Month'];

export default function HrLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [query, setQuery] = useState('');
  const [dateRangeLabel, setDateRangeLabel] = useState('Today');
  const { employees, candidates, interviews } = useHrDesk();
  const { tickets } = useTickets();
  const { leaveRequests } = useLeave();

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

  // Real events instead of seeded mock notifications — anything HR still
  // needs to act on: tickets nobody's started yet, leave requests still
  // awaiting a decision. There's no persisted "read" state for either kind
  // (no backend model for it), so "unread" here just means "still pending" —
  // it clears itself the moment the ticket/leave request is actually handled.
  const notifications = useMemo(() => {
    const ticketNotifs = tickets
      .filter((t) => t.status === 'Open')
      .map((t) => ({
        id: `ticket-${t.id}`,
        text: `New ticket from ${t.user || 'someone'}: ${t.title}`,
        time: relativeTime(t.submittedAt),
        at: t.submittedAt,
        unread: true,
        path: '/hr/tickets',
      }));
    const leaveNotifs = leaveRequests
      // Admin/Ops and IT leave routes to the Founder to decide, not HR (see
      // isFounderApproval) — surfacing it here would look actionable when
      // HR actually can't do anything with it.
      .filter((l) => l.status === 'Pending' && !isFounderApproval(l.department))
      .map((l) => ({
        id: `leave-${l.id}`,
        text: `Leave request from ${l.employee || 'someone'} awaiting approval`,
        time: relativeTime(l.submitted_at),
        at: l.submitted_at,
        unread: true,
        path: '/hr/approvals',
      }));
    return [...ticketNotifs, ...leaveNotifs]
      .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
      .slice(0, 20);
  }, [tickets, leaveRequests]);
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
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary/30 selection:text-primary">
      {/* Sidebar — Fixed Height with Zero Scrollbar */}
      <aside
        className={`fixed lg:sticky top-3 left-3 lg:left-auto lg:ml-3 z-40 ${
          collapsed ? 'w-[195px] lg:w-[64px]' : 'w-[195px] xl:w-[200px]'
        } h-[calc(100vh-1.5rem)] bg-background border border-border rounded-lg flex flex-col justify-between shrink-0 p-3 overflow-hidden transition-all duration-300 lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header — hidden when collapsed so the rail stays icon-width */}
          {!collapsed && (
            <div className="px-3 py-2 mb-3 border-b border-border">
              <div className="font-bold text-sm tracking-tight text-foreground leading-none">
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
                  className={`mx-1 flex items-center py-1.5 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all duration-200 text-left cursor-pointer ${
                    collapsed ? 'lg:justify-center lg:px-0 gap-2.5 px-2.5' : 'gap-2.5 px-2.5'
                  } ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow border border-primary/40 font-semibold'
                      : 'bg-muted text-muted-foreground border border-border hover:border-muted-foreground/40 hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon size={14} className={`shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile Footer */}
        <div className="flex flex-col gap-2 pt-3 border-t border-border">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((p) => !p)}
              title={collapsed ? user?.full_name || 'Account' : undefined}
              className={`w-full flex items-center rounded-xl bg-muted border border-border hover:border-muted-foreground/40 transition-colors text-left cursor-pointer ${
                collapsed ? 'lg:justify-center lg:p-1.5 justify-between p-2.5' : 'justify-between p-2.5'
              }`}
            >
              <div className={`flex items-center min-w-0 ${collapsed ? 'lg:justify-center gap-2.5' : 'gap-2.5'}`}>
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-xs text-primary">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'H'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary border-2 border-muted" />
                </div>
                <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
                  <div className="text-xs font-semibold text-foreground truncate">{user?.full_name || 'HR Manager'}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{ROLE_LABEL[user?.role] || 'HR Manager'}</div>
                </div>
              </div>
              <ChevronDown size={14} className={`text-muted-foreground shrink-0 ${collapsed ? 'lg:hidden' : ''}`} />
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

          {/* Collapse toggle — desktop only; on mobile the sidebar is a drawer */}
          <button
            type="button"
            onClick={() => setCollapsed((p) => !p)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex w-full p-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground items-center justify-center gap-2 text-xs font-medium transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 bg-background/80 z-30 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* Main Workspace */}
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
                className="h-9 bg-muted backdrop-blur-md border border-border rounded-xl pl-9 pr-4 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:bg-muted w-full transition-colors"
              />
              {results.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-full bg-muted border border-border rounded-xl shadow-xl overflow-hidden z-30">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goTo(r.path)}
                      className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-accent transition-colors cursor-pointer border-b border-border last:border-0"
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

          <div className="flex items-center gap-2.5 shrink-0 ml-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifs((p) => !p)}
                className="relative w-9 h-9 rounded-xl bg-muted backdrop-blur-md border border-border hover:bg-accent hover:border-muted-foreground/40 text-muted-foreground transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-primary-foreground text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-background">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute top-full right-0 mt-2 w-[300px] bg-muted border border-border rounded-lg shadow-xl overflow-hidden z-30">
                  <div className="px-4 py-2.5 border-b border-border text-xs font-bold text-foreground">Notifications</div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-[11px] text-muted-foreground">All caught up — nothing pending.</div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            goTo(n.path);
                            setShowNotifs(false);
                          }}
                          className="w-full text-left px-4 py-2.5 border-b border-border last:border-0 hover:bg-accent cursor-pointer"
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

            {/* Email Inbox Quick Action */}
            <button
              type="button"
              onClick={() => goTo('/hr/email')}
              aria-label="Open email inbox"
              title="Email inbox"
              className="relative w-9 h-9 rounded-xl bg-muted backdrop-blur-md border border-border hover:bg-accent hover:border-muted-foreground/40 text-muted-foreground transition-colors flex items-center justify-center cursor-pointer shrink-0"
            >
              <Mail size={15} />
            </button>

            {/* Calendar Date Pill */}
            <button
              type="button"
              onClick={() => setDateRangeLabel((l) => DATE_RANGES[(DATE_RANGES.indexOf(l) + 1) % DATE_RANGES.length])}
              className="h-9 hidden sm:flex items-center gap-2 px-3 rounded-xl bg-muted backdrop-blur-md border border-border hover:bg-accent hover:border-muted-foreground/40 text-xs text-muted-foreground font-medium shrink-0 cursor-pointer transition-colors"
            >
              <Calendar size={13} className="text-primary" />
              <span>{dateRangeLabel}</span>
              <ChevronDown size={11} className="text-muted-foreground" />
            </button>

            {/* User Profile Pill — display only; sign out lives in the sidebar profile card */}
            <div className="h-9 flex items-center gap-2 px-2.5 rounded-xl bg-muted backdrop-blur-md border border-border shrink-0">
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

        <main className="flex-1 p-3 lg:p-4 min-w-0 overflow-y-auto flex flex-col h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)]">{children}</main>
      </div>
    </div>
  );
}

