import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  LayoutGrid,
  Ticket,
  CheckSquare,
  Server,
  Monitor,
  Package,
  Shield,
  Wifi,
  Users,
  BarChart2,
  BookOpen,
  Bell,
  FileText,
  Settings,
  Search,
  Calendar,
  LogOut,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  MessageSquare,
} from 'lucide-react';
import TeamChatDrawer from './TeamChatDrawer';

const ROLE_LABEL = {
  founder: 'Founder / Admin',
  hr: 'HR Manager',
  it: 'IT Manager',
  employee: 'Employee',
};

const NOTIFICATIONS = [
  { id: 1, text: 'New ticket INC-1024 assigned to you', time: '10 min ago' },
  { id: 2, text: 'Data Transfer request is waiting for approval', time: '35 min ago' },
  { id: 3, text: 'VPN request approved for John Doe', time: '2 hr ago' },
];

const DATE_RANGES = ['Exact Date', 'Today', 'This Week', 'This Month'];

const IT_NAV_ITEMS = (approvalCount) => [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'tickets', label: 'Tickets Queue', icon: Ticket },
  { id: 'approval', label: 'Approval Center', icon: CheckSquare, badge: approvalCount || undefined },
  { id: 'datarequests', label: 'Data Requests', icon: Server },
  { id: 'assets', label: 'Asset Management', icon: Monitor },
  { id: 'reports', label: 'Reports & Logs', icon: BarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const EMPLOYEE_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'tickets', label: 'My Tickets', icon: Ticket },
];

export default function ItDeskLayout({ activeTab, setActiveTab, children, searchIndex = [], role = 'it', approvalCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dateRangeLabel, setDateRangeLabel] = useState('Exact Date');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return searchIndex
      .filter((r) => r.label.toLowerCase().includes(q) || r.sub?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, searchIndex]);

  function goToResult(tab) {
    setActiveTab(tab);
    setQuery('');
  }

  function handleSignOut() {
    logout();
    navigate('/', { replace: true });
  }

  const navItems = role === 'employee' ? EMPLOYEE_NAV_ITEMS : IT_NAV_ITEMS(approvalCount);

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    weekday: 'short',
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col lg:flex-row font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* Left Sidebar — Fixed Height with Zero Scrollbar */}
      <aside
        className={`${
          collapsed ? 'w-full lg:w-[64px]' : 'w-full lg:w-[195px] xl:w-[200px]'
        } m-3 lg:h-[calc(100vh-1.5rem)] lg:sticky lg:top-3 bg-[#111115] border border-white/[0.07] rounded-3xl flex flex-col justify-between shrink-0 p-3 transition-all duration-300 overflow-hidden`}
      >
        <div>
          {/* Brand Header */}
          {!collapsed && (
            <div className="px-3 py-2 mb-3 border-b border-white/[0.06]">
              <div className="font-bold text-sm tracking-tight text-white leading-none">
                {role === 'employee' ? 'Employee Portal' : 'IT Dashboard'}
              </div>
            </div>
          )}

          {/* Nav List */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-2.5 rounded-xl text-[11px] font-mono font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer flex items-center ${
                    collapsed ? 'justify-center px-0' : 'px-3 justify-between'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-[#ff5b00] to-[#ff6a00] text-white shadow-[0_0_15px_rgba(255,91,0,0.4)] border border-orange-400/40 font-black'
                      : 'bg-[#18181c] text-gray-300 border border-white/10 hover:border-white/20 hover:text-white hover:bg-[#22222a]'
                  }`}
                  title={item.label}
                >
                  <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                    <Icon size={16} className={isActive ? 'text-white' : 'text-gray-400'} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!collapsed && item.badge && (
                    <span className={`w-4 h-4 rounded-full font-bold text-[9px] flex items-center justify-center shrink-0 ${isActive ? 'bg-white text-[#ff5b00]' : 'bg-[#ff5b00] text-white'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="flex flex-col gap-2 pt-3 border-t border-white/[0.07]">
          {/* User Profile Card */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className={`w-full flex items-center rounded-xl bg-[#17171c] border border-white/[0.06] hover:border-white/10 transition-colors cursor-pointer ${
                collapsed ? 'justify-center p-1.5' : 'justify-between p-2.5'
              }`}
            >
              <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                <div className="relative flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#e86024]/20 border border-[#e86024]/40 flex items-center justify-center font-bold text-xs text-[#e86024] shrink-0">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'J'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#17171c]" />
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-xs font-semibold text-white truncate">
                      {user?.full_name || 'John Anderson'}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">
                      {ROLE_LABEL[user?.role] || 'IT Manager'}
                    </div>
                  </div>
                )}
              </div>
              {!collapsed && <ChevronDown size={14} className="text-gray-400 shrink-0" />}
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

          {/* Collapse Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="w-full p-2 rounded-xl bg-[#17171c] border border-white/[0.06] text-gray-400 hover:text-white flex items-center justify-center gap-2 text-xs font-medium transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!collapsed && <span>Collapse Menu</span>}
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen max-h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-white/5 px-4 lg:px-6 flex items-center justify-between shrink-0 bg-[#0c0c0e]/90 backdrop-blur-md sticky top-0 z-30">
          {/* Search Box */}
          <div className="relative flex items-center">
            <Search size={15} className="absolute left-3.5 text-gray-400 pointer-events-none z-10" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tickets, requests, approvals..."
              className="h-9 bg-[#16161a] border border-white/10 rounded-xl pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e86024] w-[260px] sm:w-[320px] transition-colors"
            />
            {results.length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-[320px] bg-[#18181c] border border-white/10 rounded-xl shadow-xl overflow-hidden z-30">
                {results.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToResult(r.tab)}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{r.label}</div>
                      <div className="text-[10px] text-gray-500 truncate">{r.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifs((p) => !p)}
                className="relative w-9 h-9 rounded-xl bg-[#16161a] border border-white/10 hover:border-white/20 text-gray-300 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                <Bell size={15} />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#e86024] text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-[#0c0c0e]">
                  {NOTIFICATIONS.length}
                </span>
              </button>
              {showNotifs && (
                <div className="absolute top-full right-0 mt-2 w-[300px] bg-[#18181c] border border-white/10 rounded-2xl shadow-xl overflow-hidden z-30">
                  <div className="px-4 py-2.5 border-b border-white/5 text-xs font-bold text-white">Notifications</div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {NOTIFICATIONS.map((n) => (
                      <div key={n.id} className="p-3 border-b border-white/5 last:border-0 hover:bg-white/5">
                        <div className="text-xs font-semibold text-white">{n.text}</div>
                        <div className="text-[9px] text-gray-500 mt-1">{n.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Team Chat Hub Button */}
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="h-9 px-3 rounded-xl bg-[#e86024]/10 hover:bg-[#e86024]/20 border border-[#e86024]/30 text-[#e86024] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <MessageSquare size={14} />
              <span className="hidden sm:inline">Team Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setDateRangeLabel((l) => DATE_RANGES[(DATE_RANGES.indexOf(l) + 1) % DATE_RANGES.length])}
              className="h-9 flex items-center gap-2 px-3 rounded-xl bg-[#16161a] border border-white/10 hover:border-white/20 text-xs text-gray-300 font-medium shrink-0 cursor-pointer transition-colors"
            >
              <Calendar size={13} className="text-[#e86024]" />
              <span>{dateRangeLabel === 'Exact Date' ? currentDateStr : dateRangeLabel}</span>
              <ChevronDown size={11} className="text-gray-400" />
            </button>
          </div>
        </header>

        {/* View Content — Zero Page Scrollbar */}
        <main className="flex-1 p-3 lg:p-4 min-w-0 overflow-hidden flex flex-col justify-between h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)]">{children}</main>
      </div>

      <TeamChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
