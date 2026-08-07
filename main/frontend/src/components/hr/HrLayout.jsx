import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
} from 'lucide-react';
import {
  candidates,
  employees,
  interviews,
  notifications as allNotifications,
} from '../../data/hrMockData';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutGrid, path: '/hr/overview' },
  { label: 'Directory', icon: Contact, path: '/hr/directory' },
  { label: 'Candidates', icon: UserSearch, path: '/hr/candidates' },
  { label: 'Interviews', icon: CalendarClock, path: '/hr/interviews' },
  { label: 'Attendance', icon: ClockIcon, path: '/hr/attendance' },
  { label: 'Email', icon: Mail, path: '/hr/email' },
  { label: 'Reports', icon: BarChart2, path: '/hr/reports' },
];

function buildSearchIndex() {
  return [
    ...candidates.map((c) => ({ group: 'Candidates', label: c.name, sub: c.appliedFor, path: '/hr/candidates' })),
    ...employees.map((e) => ({ group: 'Employees', label: e.name, sub: e.designation, path: '/hr/directory' })),
    ...interviews.map((i) => ({ group: 'Interviews', label: `${i.candidate} - ${i.type}`, sub: `${i.date} ${i.time}`, path: '/hr/interviews' })),
  ];
}

const ROLE_LABEL = { founder: 'Founder', hr: 'HR Manager', it: 'IT Support', employee: 'Employee' };
const DATE_RANGES = ['Today', 'This Week', 'This Month'];

export default function HrLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [query, setQuery] = useState('');
  const [dateRangeLabel, setDateRangeLabel] = useState('Today');

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
      {/* Sidebar — Fixed Height with Zero Scrollbar */}
      <aside
        className={`fixed lg:sticky top-3 left-3 lg:left-auto lg:ml-3 z-40 w-[195px] xl:w-[200px] h-[calc(100vh-1.5rem)] bg-[#111115] border border-white/[0.07] rounded-3xl flex flex-col justify-between shrink-0 p-3 overflow-hidden transition-transform lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="px-3 py-2 mb-3 border-b border-white/[0.06]">
            <div className="font-bold text-sm tracking-tight text-white leading-none">
              HR Dashboard
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
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

        {/* Profile Footer */}
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
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'J'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#17171c]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">{user?.full_name || 'John Anderson'}</div>
                  <div className="text-[10px] text-gray-400 truncate">{ROLE_LABEL[user?.role] || 'HR Manager'}</div>
                </div>
              </div>
              <ChevronDown size={14} className="text-gray-400 shrink-0" />
            </button>

            {showProfileMenu && (
              <div className="absolute bottom-full left-0 min-w-[135px] mb-2 bg-[#17171c] border border-white/10 rounded-xl p-1.5 shadow-2xl z-50">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left cursor-pointer whitespace-nowrap"
                >
                  <LogOut size={14} className="shrink-0" />
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

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen max-h-screen overflow-hidden">
        <header className="h-14 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-white/[0.04] backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sticky top-0 z-20">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-gray-300 cursor-pointer shrink-0"
            >
              <Menu size={16} />
            </button>

            <div className="relative flex-1 max-w-[360px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search employees, candidates, tickets..."
                className="h-9 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e86024] focus:bg-white/[0.07] w-full transition-colors"
              />
              {results.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-full bg-[#18181c] border border-white/10 rounded-xl shadow-xl overflow-hidden z-30">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goTo(r.path)}
                      className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-0"
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

          <div className="flex items-center gap-2.5 shrink-0 ml-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifs((p) => !p)}
                className="relative w-9 h-9 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                <Bell size={15} />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#e86024] text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-[#09090b]">
                  2
                </span>
              </button>
              {showNotifs && (
                <div className="absolute top-full right-0 mt-2 w-[300px] bg-[#18181c] border border-white/10 rounded-2xl shadow-xl overflow-hidden z-30">
                  <div className="px-4 py-2.5 border-b border-white/5 text-xs font-bold text-white">Notifications</div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {allNotifications.map((n) => (
                      <div key={n.id} className="px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/5">
                        <div className="flex items-start gap-2">
                          {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-[#e86024] mt-1.5 shrink-0" />}
                          <div className={n.unread ? '' : 'pl-3.5'}>
                            <div className="text-[11px] text-gray-200">{n.text}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{n.time}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Email Inbox Quick Action */}
            <button
              type="button"
              onClick={() => goTo('/hr/email')}
              className="relative w-9 h-9 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300 transition-colors flex items-center justify-center cursor-pointer shrink-0"
            >
              <Mail size={15} />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#e86024] text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-[#09090b]">
                3
              </span>
            </button>

            {/* Calendar Date Pill */}
            <button
              type="button"
              onClick={() => setDateRangeLabel((l) => DATE_RANGES[(DATE_RANGES.indexOf(l) + 1) % DATE_RANGES.length])}
              className="h-9 hidden sm:flex items-center gap-2 px-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 text-xs text-gray-300 font-medium shrink-0 cursor-pointer transition-colors"
            >
              <Calendar size={13} className="text-[#e86024]" />
              <span>{dateRangeLabel}</span>
              <ChevronDown size={11} className="text-gray-400" />
            </button>

            {/* User Profile Pill — display only; sign out lives in the sidebar profile card */}
            <div className="h-9 flex items-center gap-2 px-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#e86024]/20 border border-[#e86024]/40 flex items-center justify-center font-bold text-[10px] text-[#e86024]">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'H'}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-[11px] font-semibold text-white leading-none">{user?.full_name || 'HR Manager'}</span>
                <span className="text-[9px] text-gray-400">{ROLE_LABEL[user?.role] || 'HR'}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 lg:p-4 min-w-0 overflow-y-auto flex flex-col h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)]">{children}</main>
      </div>
    </div>
  );
}

