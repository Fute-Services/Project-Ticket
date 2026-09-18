import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import {
  LayoutGrid,
  ListChecks,
  FolderKanban,
  Truck,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  Calendar,
  MessageSquare,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { tasks as allTasks } from '../../data/coordinatorMockData';
import { useTaskProject } from '../../context/TaskProjectContext';
import { getProductionRecords } from '../../utils/api';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutGrid, path: '/coordinator/overview' },
  { label: 'Projects', icon: FolderKanban, path: '/coordinator/projects' },
  { label: 'Tasks', icon: ListChecks, path: '/coordinator/tasks' },
  { label: 'Delivery Tracker', icon: Truck, path: '/coordinator/delivery-tracker' },
];

function buildSearchIndex() {
  return allTasks.map((t) => ({ group: 'Tasks', label: t.title, sub: t.assignee, path: '/coordinator/tasks' }));
}

const ROLE_LABEL = { coordinator: 'Project Coordinator' };
const DATE_RANGES = ['Today', 'This Week', 'This Month'];

export default function CoordinatorLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [query, setQuery] = useState('');
  const [dateRangeLabel, setDateRangeLabel] = useState('Today');

  // Real notifications, not a static placeholder: overdue work plus any
  // update someone posted in the last 24h - computed from data the shared
  // board already polls (TaskProjectContext), no separate notifications
  // backend needed.
  const { tasks: notifTasks, projects: notifProjects } = useTaskProject();

  // Delivery deadlines live in a separate collection (production records),
  // not on the task/project doc, so they need their own fetch here rather
  // than piggy-backing on TaskProjectContext's poll.
  const [deliveryRecords, setDeliveryRecords] = useState([]);
  useEffect(() => {
    getProductionRecords()
      .then(({ data }) => setDeliveryRecords(data || []))
      .catch((e) => console.error('Failed to load delivery records for notifications:', e.response?.data?.error || e.message));
  }, []);

  const notifications = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const items = [];
    for (const p of notifProjects) {
      if (!p.archived && p.status !== 'Completed' && p.dueDate && p.dueDate < today) {
        items.push({ id: `proj-${p.id}`, text: `"${p.name}" is overdue (was due ${p.dueDate})`, at: p.dueDate });
      }
    }
    for (const t of notifTasks) {
      if (t.status !== 'Completed' && t.dueDate && t.dueDate < today) {
        items.push({ id: `task-${t.id}`, text: `Task "${t.title}" is overdue (${t.assignee || 'unassigned'})`, at: t.dueDate });
      }
      if (t.remarksAt && new Date(t.remarksAt).getTime() >= dayAgo) {
        items.push({ id: `remark-${t.id}`, text: `${t.remarksBy} posted an update on "${t.title}"`, at: t.remarksAt });
      }
    }
    for (const r of deliveryRecords) {
      if (r.closureStatus !== 'Closed' && r.deliveryDeadline && r.deliveryDeadline < today) {
        items.push({ id: `delivery-${r.id}`, text: `Delivery for "${r.projectCode}" is overdue (was due ${r.deliveryDeadline})`, at: r.deliveryDeadline });
      }
    }
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
  }, [notifTasks, notifProjects, deliveryRecords]);

  const searchIndex = useMemo(buildSearchIndex, []);
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

  const { canAccess } = usePermissions();
  const navItems = NAV_ITEMS.filter((item) => canAccess('coordinator', item.path));

  // A permission revoked while the user is on that page (or a sub-route of
  // it, e.g. a project detail page) shouldn't leave them stranded there.
  // Team Chat isn't permission-gated (same as the profile menu), so it's
  // exempt from this check like navItems' own paths are.
  useEffect(() => {
    if (location.pathname === '/coordinator/team-chat') return;
    const stillAllowed = navItems.some(
      (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    );
    if (navItems.length && !stillAllowed) {
      navigate(navItems[0].path, { replace: true });
    }
  }, [navItems, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-[#0F090A] text-foreground flex font-sans selection:bg-primary/30 selection:text-primary p-2.5 lg:p-3 gap-3 overflow-x-hidden">
      <aside
        className={`fixed lg:sticky top-3 left-3 lg:left-auto z-40 ${
          collapsed ? 'w-[240px] lg:w-[68px]' : 'w-[240px] xl:w-[250px]'
        } h-[calc(100vh-1.5rem)] sidebar-glass rounded-2xl flex flex-col justify-between shrink-0 p-4 overflow-hidden transition-all duration-300 lg:translate-x-0 shadow-2xl text-white ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className={`flex items-center px-2 py-1 mb-3 ${collapsed ? 'lg:justify-center gap-2.5' : 'gap-2.5'}`}>
            <div className="w-8 h-8 rounded-xl bg-rose-600/20 border border-rose-600/40 flex items-center justify-center shadow shrink-0">
              <ListChecks size={17} className="text-rose-500" />
            </div>
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <div className="font-semibold text-sm tracking-tight text-white leading-none">
                COORDINATOR
              </div>
              <div className="text-[9px] text-white/50 font-medium tracking-wider uppercase mt-0.5">
                Project Coordination
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
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
                  <Icon size={15} className={`shrink-0 ${isActive ? 'text-rose-500' : 'text-white/60'}`} />
                  <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => goTo('/coordinator/team-chat')}
              title={collapsed ? 'Team Chat' : undefined}
              aria-current={location.pathname === '/coordinator/team-chat' ? 'page' : undefined}
              className={`mx-1 flex items-center py-2 px-2.5 rounded-lg text-[11px] font-mono font-bold tracking-wider uppercase transition-all duration-200 text-left cursor-pointer ${
                collapsed ? 'lg:justify-center lg:px-0 gap-2.5' : 'gap-2.5'
              } ${
                location.pathname === '/coordinator/team-chat'
                  ? 'bg-white/[0.14] text-white shadow-sm border border-white/20 font-semibold backdrop-blur-md'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.07] border border-transparent'
              }`}
            >
              <MessageSquare size={15} className={`shrink-0 ${location.pathname === '/coordinator/team-chat' ? 'text-rose-500' : 'text-white/60'}`} />
              <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>Team Chat</span>
            </button>
          </nav>
        </div>

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
                  <div className="w-8 h-8 rounded-full bg-rose-600/20 border border-rose-600/40 flex items-center justify-center font-bold text-xs text-rose-300">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#160C0E]" />
                </div>
                <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
                  <div className="text-xs font-semibold text-white truncate">{user?.full_name || 'Project Coordinator'}</div>
                  <div className="text-[10px] text-white/50 truncate">{ROLE_LABEL[user?.role] || 'Coordinator'}</div>
                </div>
              </div>
              <ChevronDown size={14} className={`text-white/60 shrink-0 ${collapsed ? 'lg:hidden' : ''}`} />
            </button>

            {showProfileMenu && (
              <div className="absolute bottom-full left-0 min-w-[150px] w-full mb-2 bg-[#1A0E10]/95 backdrop-blur-xl border border-white/15 rounded-xl p-1.5 shadow-2xl z-50">
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

            {location.pathname.startsWith('/coordinator/tasks') && (
              <div className="relative flex-1 max-w-[360px]">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tasks..."
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
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifs((p) => !p)}
                aria-label="Notifications"
                aria-expanded={showNotifs}
                title="Notifications"
                className="relative w-9 h-9 rounded-full bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                <Bell size={15} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
                )}
              </button>
              {showNotifs && (
                <div className="absolute top-full right-0 mt-2 w-[300px] max-h-[360px] overflow-y-auto bg-white border border-border rounded-2xl shadow-xl z-30">
                  <div className="px-4 py-2.5 border-b border-border/60 text-xs font-bold text-foreground sticky top-0 bg-white">Notifications</div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[11px] text-muted-foreground">You're all caught up.</div>
                  ) : (
                    <div className="flex flex-col divide-y divide-border/60">
                      {notifications.map((n) => (
                        <div key={n.id} className="px-4 py-2.5 text-xs text-foreground">{n.text}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setDateRangeLabel((l) => DATE_RANGES[(DATE_RANGES.indexOf(l) + 1) % DATE_RANGES.length])}
              className="h-9 hidden sm:flex items-center gap-1.5 px-3 rounded-full bg-muted/60 hover:bg-muted border border-border text-xs text-muted-foreground font-medium shrink-0 cursor-pointer transition-colors"
            >
              <Calendar size={13} className="text-primary" />
              <span>{dateRangeLabel}</span>
              <ChevronDown size={11} className="text-muted-foreground" />
            </button>

            {/* User Profile Pill */}
            <div className="h-9 flex items-center gap-2 px-2.5 rounded-full bg-muted/60 border border-border shrink-0">
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-[10px] text-primary">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-[11px] font-semibold text-foreground leading-none">{user?.full_name || 'Project Coordinator'}</span>
                <span className="text-[9px] text-muted-foreground">{ROLE_LABEL[user?.role] || 'Coordinator'}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3.5 lg:p-5 min-w-0 overflow-y-auto flex flex-col">{children}</main>
      </div>
    </div>
  );
}
