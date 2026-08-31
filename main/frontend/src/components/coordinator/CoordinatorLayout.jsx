import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import {
  LayoutGrid,
  ListChecks,
  FolderKanban,
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
import TeamChatDrawer from '../TeamChatDrawer';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutGrid, path: '/coordinator/overview' },
  { label: 'Projects', icon: FolderKanban, path: '/coordinator/projects' },
  { label: 'Tasks', icon: ListChecks, path: '/coordinator/tasks' },
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
  const [isChatOpen, setIsChatOpen] = useState(false);

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
  useEffect(() => {
    const stillAllowed = navItems.some(
      (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    );
    if (navItems.length && !stillAllowed) {
      navigate(navItems[0].path, { replace: true });
    }
  }, [navItems, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary/30 selection:text-primary">
      <aside
        className={`fixed lg:sticky top-3 left-3 lg:left-auto lg:ml-3 z-40 ${
          collapsed ? 'w-[240px] lg:w-[68px]' : 'w-[240px] xl:w-[250px]'
        } h-[calc(100vh-1.5rem)] bg-card border border-border rounded-lg flex flex-col justify-between shrink-0 p-4 overflow-hidden transition-all duration-300 lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className={`flex items-center px-2 py-1 mb-3 ${collapsed ? 'lg:justify-center gap-2.5' : 'gap-2.5'}`}>
            <div className="w-8 h-8 rounded-xl bg-primary-hover flex items-center justify-center shadow shrink-0">
              <ListChecks size={17} className="text-foreground" />
            </div>
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <div className="font-semibold text-sm tracking-tight text-foreground leading-none">
                COORDINATOR
              </div>
              <div className="text-[9px] text-muted-foreground font-medium tracking-wider uppercase mt-0.5">
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
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary border-2 border-muted" />
                </div>
                <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
                  <div className="text-xs font-semibold text-foreground truncate">{user?.full_name || 'Project Coordinator'}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{ROLE_LABEL[user?.role] || 'Coordinator'}</div>
                </div>
              </div>
              <ChevronDown size={14} className={`text-muted-foreground shrink-0 ${collapsed ? 'lg:hidden' : ''}`} />
            </button>

            {showProfileMenu && (
              <div className="absolute bottom-full left-0 min-w-[150px] w-full mb-2 bg-muted border border-border rounded-xl p-1.5 shadow-xl z-50">
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

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border border-border/60 rounded-xl mx-3 mt-3 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 bg-card/60 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10)] sticky top-3 z-20">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-xl bg-muted backdrop-blur-md border border-border text-muted-foreground cursor-pointer shrink-0"
            >
              <Menu size={16} />
            </button>

            <div className="relative flex-1 max-w-[400px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks..."
                className="h-10 bg-muted backdrop-blur-md border border-border rounded-xl pl-10 pr-4 text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:bg-muted w-full transition-colors"
              />
              {results.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-full bg-muted border border-border rounded-xl shadow-xl overflow-hidden z-30">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goTo(r.path)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-accent transition-colors cursor-pointer border-b border-border last:border-0"
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

          <div className="flex items-center gap-3 shrink-0 ml-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifs((p) => !p)}
                aria-label="Notifications"
                aria-expanded={showNotifs}
                title="Notifications"
                className="relative w-10 h-10 rounded-xl bg-muted backdrop-blur-md border border-border hover:bg-accent hover:border-muted-foreground/40 text-muted-foreground transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                <Bell size={16} />
              </button>
              {showNotifs && (
                <div className="absolute top-full right-0 mt-2 w-[260px] bg-muted border border-border rounded-lg shadow-xl overflow-hidden z-30">
                  <div className="px-4 py-3 border-b border-border text-xs font-bold text-foreground">Notifications</div>
                  <div className="px-4 py-6 text-center text-[11px] text-muted-foreground">You're all caught up.</div>
                </div>
              )}
            </div>

            {/* Team Chat Hub Button */}
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              aria-label="Team Chat"
              className="h-10 px-3 rounded-xl bg-card border border-border text-foreground text-xs font-medium flex items-center gap-2 shadow hover:bg-accent transition-all cursor-pointer shrink-0"
            >
              <MessageSquare size={14} className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" />
              <span className="hidden sm:inline drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">Team Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setDateRangeLabel((l) => DATE_RANGES[(DATE_RANGES.indexOf(l) + 1) % DATE_RANGES.length])}
              className="h-10 hidden sm:flex items-center gap-2 px-3.5 rounded-xl bg-muted backdrop-blur-md border border-border hover:bg-accent hover:border-muted-foreground/40 text-xs text-muted-foreground font-medium shrink-0 cursor-pointer transition-colors"
            >
              <Calendar size={14} className="text-primary" />
              <span>{dateRangeLabel}</span>
              <ChevronDown size={12} className="text-muted-foreground" />
            </button>

            {/* Display only; sign out lives in the sidebar profile card */}
            <div className="h-10 flex items-center gap-2.5 px-3 rounded-xl bg-muted backdrop-blur-md border border-border shrink-0">
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">{children}</main>
      </div>

      <TeamChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
