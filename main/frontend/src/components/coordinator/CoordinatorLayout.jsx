import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex font-sans selection:bg-orange-500/30 selection:text-orange-200">
      <aside
        className={`fixed lg:sticky top-3 left-3 lg:left-auto lg:ml-3 z-40 w-[240px] xl:w-[250px] h-[calc(100vh-1.5rem)] bg-[#111115] border border-white/[0.07] rounded-3xl flex flex-col justify-between shrink-0 p-4 overflow-hidden transition-transform lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-center gap-2.5 px-2 py-1 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#e86024] to-[#b33f10] flex items-center justify-center shadow-lg shadow-orange-950/40 shrink-0">
              <ListChecks size={17} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-sm tracking-tight text-white leading-none">
                COORDINATOR
              </div>
              <div className="text-[9px] text-gray-400 font-medium tracking-wider uppercase mt-0.5">
                Project Coordination
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => goTo(item.path)}
                  className={`mx-1 flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all duration-200 text-left cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#ff5b00] to-[#ff6a00] text-white shadow-[0_0_14px_rgba(255,91,0,0.4)] border border-orange-400/40 font-black'
                      : 'bg-[#18181c] text-gray-300 border border-white/10 hover:border-white/20 hover:text-white hover:bg-[#22222a]'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-gray-400'} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-3 border-t border-white/[0.07]">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((p) => !p)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#17171c] border border-white/[0.06] hover:border-white/10 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-[#e86024]/20 border border-[#e86024]/40 flex items-center justify-center font-bold text-xs text-[#e86024] shrink-0">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#17171c]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">{user?.full_name || 'Project Coordinator'}</div>
                  <div className="text-[10px] text-gray-400 truncate">{ROLE_LABEL[user?.role] || 'Coordinator'}</div>
                </div>
              </div>
              <ChevronDown size={14} className="text-gray-400 shrink-0" />
            </button>

            {showProfileMenu && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-[#17171c] border border-white/10 rounded-xl p-1.5 shadow-xl z-50">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-white/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 bg-white/[0.04] backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sticky top-0 z-20">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-gray-300 cursor-pointer shrink-0"
            >
              <Menu size={16} />
            </button>

            <div className="relative flex-1 max-w-[400px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks..."
                className="h-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e86024] focus:bg-white/[0.07] w-full transition-colors"
              />
              {results.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-full bg-[#18181c] border border-white/10 rounded-xl shadow-xl overflow-hidden z-30">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goTo(r.path)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-0"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{r.label}</div>
                        <div className="text-[10px] text-gray-500 truncate">{r.sub}</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/10 shrink-0 ml-2">
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
                className="relative w-10 h-10 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                <Bell size={16} />
              </button>
              {showNotifs && (
                <div className="absolute top-full right-0 mt-2 w-[260px] bg-[#18181c] border border-white/10 rounded-2xl shadow-xl overflow-hidden z-30">
                  <div className="px-4 py-3 border-b border-white/5 text-xs font-bold text-white">Notifications</div>
                  <div className="px-4 py-6 text-center text-[11px] text-gray-500">You're all caught up.</div>
                </div>
              )}
            </div>

            {/* Team Chat Hub Button */}
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="h-10 px-3 rounded-xl bg-gradient-to-b from-[#3a3a3f] to-[#151517] border border-black text-white text-xs font-bold flex items-center gap-2 shadow-[0_2px_0_#000,0_4px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#46464b] hover:to-[#1c1c1f] active:translate-y-[1px] active:shadow-[0_1px_0_#000,0_2px_4px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(0,0,0,0.4)] transition-all cursor-pointer shrink-0"
            >
              <MessageSquare size={14} className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" />
              <span className="hidden sm:inline drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">Team Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setDateRangeLabel((l) => DATE_RANGES[(DATE_RANGES.indexOf(l) + 1) % DATE_RANGES.length])}
              className="h-10 hidden sm:flex items-center gap-2 px-3.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 text-xs text-gray-300 font-medium shrink-0 cursor-pointer transition-colors"
            >
              <Calendar size={14} className="text-[#e86024]" />
              <span>{dateRangeLabel}</span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>

            {/* Display only; sign out lives in the sidebar profile card */}
            <div className="h-10 flex items-center gap-2.5 px-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#e86024]/20 border border-[#e86024]/40 flex items-center justify-center font-bold text-[10px] text-[#e86024]">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-[11px] font-semibold text-white leading-none">{user?.full_name || 'Project Coordinator'}</span>
                <span className="text-[9px] text-gray-400">{ROLE_LABEL[user?.role] || 'Coordinator'}</span>
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
