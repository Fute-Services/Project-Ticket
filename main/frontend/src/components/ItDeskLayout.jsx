import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
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
  Search,
  TrendingUp,
  CalendarDays,
  LogOut,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Film,
} from 'lucide-react';

const ROLE_LABEL = {
  founder: 'Founder / Admin',
  hr: 'HR Manager',
  it: 'IT Manager',
  employee: 'Employee',
};

const NOTIFICATIONS = [
  { id: 1, text: 'New ticket INC-1024 assigned to you', time: '10 min ago' },
  { id: 2, text: 'Data Transfer request is waiting for approval', time: '35 min ago' },
  { id: 3, text: 'VPN request approved for Abhinav Rai', time: '2 hr ago' },
];

const IT_NAV_ITEMS = (approvalCount) => [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'tickets', label: 'Tickets Queue', icon: Ticket },
  { id: 'approval', label: 'Approval Center', icon: CheckSquare, badge: approvalCount || undefined },
  { id: 'datarequests', label: 'Data Requests', icon: Server },
  { id: 'assets', label: 'Asset Management', icon: Monitor },
  { id: 'reports', label: 'Reports & Logs', icon: BarChart2 },
  { id: 'renderstatus', label: 'Rendering Status', icon: Film },
];

const EMPLOYEE_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'tickets', label: 'My Tickets', icon: Ticket },
  { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
  { id: 'leaves', label: 'My Leaves', icon: CalendarDays },
  { id: 'performance', label: 'Performance', icon: TrendingUp },
];

export default function ItDeskLayout({ activeTab, setActiveTab, children, searchIndex = [], role = 'it', approvalCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [query, setQuery] = useState('');

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

  const { canAccess } = usePermissions();
  const allNavItems = role === 'employee' ? EMPLOYEE_NAV_ITEMS : IT_NAV_ITEMS(approvalCount);
  const navItems = allNavItems.filter((item) => canAccess(role, item.id));

  // A permission revoked while the user is sitting on that exact tab
  // shouldn't leave them on a page they can no longer reach from the nav.
  useEffect(() => {
    if (navItems.length && !navItems.some((item) => item.id === activeTab)) {
      setActiveTab(navItems[0].id);
    }
  }, [navItems, activeTab, setActiveTab]);

  return (
    <div className="min-h-screen bg-[#090f0c] text-foreground flex flex-col lg:flex-row font-sans selection:bg-primary/30 selection:text-primary p-2.5 lg:p-3 gap-3 overflow-x-hidden">
      {/* Left Sidebar - Dark Glassmorphism Fixed Height */}
      <aside
        className={`${
          // `w-auto`, not `w-full`: the sidebar also carries `m-3`, so a full
          // 100% width plus 12px of margin each side pushed the page 12px wider
          // than the viewport and gave every phone a horizontal scrollbar.
          // As a block element `w-auto` already fills the row minus its margins.
          collapsed ? 'w-auto lg:w-[64px]' : 'w-auto lg:w-[195px] xl:w-[200px]'
        } lg:h-[calc(100vh-1.5rem)] lg:sticky lg:top-3 sidebar-glass rounded-2xl flex flex-col justify-between shrink-0 p-3 transition-all duration-300 overflow-hidden shadow-2xl text-white`}
      >
        <div>
          {/* Brand Header */}
          {!collapsed && (
            <div className="px-3 py-2 mb-3 border-b border-white/10">
              <div className="font-bold text-sm tracking-tight text-white leading-none">
                {role === 'employee' ? 'Employee Portal' : 'IT Dashboard'}
              </div>
            </div>
          )}

          {/* Nav List */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-2 rounded-lg text-[11px] font-mono font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer flex items-center ${
                    collapsed ? 'justify-center px-0' : 'px-3 justify-between'
                  } ${
                    isActive
                      ? 'bg-white/[0.14] text-white shadow-sm border border-white/20 font-semibold backdrop-blur-md'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.07] border border-transparent'
                  }`}
                  title={item.label}
                >
                  <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                    <Icon size={16} className={isActive ? 'text-emerald-400' : 'text-white/60'} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!collapsed && item.badge && (
                    <span className="w-4 h-4 rounded-full font-bold text-[9px] flex items-center justify-center shrink-0 bg-emerald-400 text-black shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="flex flex-col gap-2 pt-3 border-t border-white/10">
          {/* User Profile Card */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className={`w-full flex items-center rounded-lg bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 transition-colors cursor-pointer text-white ${
                collapsed ? 'justify-center p-1.5' : 'justify-between p-2.5'
              }`}
            >
              <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                <div className="relative flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-xs text-emerald-300 shrink-0">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'J'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0c1611]" />
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-xs font-semibold text-white truncate">
                      {user?.full_name || 'John Anderson'}
                    </div>
                    <div className="text-[10px] text-white/50 truncate">
                      {ROLE_LABEL[user?.role] || 'IT Manager'}
                    </div>
                  </div>
                )}
              </div>
              {!collapsed && <ChevronDown size={14} className="text-white/60 shrink-0" />}
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
            className="w-full p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white flex items-center justify-center gap-2 text-xs font-medium transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!collapsed && <span>Collapse Menu</span>}
          </button>
        </div>
      </aside>

      {/* Main Workspace Area - Framed Rounded Tablet Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-1.5rem)] bg-[#eaf3ec] rounded-[24px] lg:rounded-[28px] border border-white/10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Top Header Bar inside rounded frame */}
        <header className="h-14 border-b border-border/70 px-4 lg:px-6 flex items-center justify-between shrink-0 bg-[#eaf3ec]/85 backdrop-blur-xl sticky top-0 z-30">
          {/* Search Box */}
          <div className="relative flex items-center">
            <Search size={15} className="absolute left-3.5 text-muted-foreground pointer-events-none z-10" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tickets, requests, approvals..."
              className="h-9 bg-white/70 hover:bg-white focus:bg-white border border-border/80 rounded-full pl-9 pr-4 text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-[260px] sm:w-[320px] transition-all shadow-sm"
            />
            {results.length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-[320px] apple-glass border border-white/80 rounded-2xl shadow-2xl overflow-hidden z-30">
                {results.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToResult(r.tab)}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/60 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{r.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{r.sub}</div>
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
                className="relative w-9 h-9 rounded-full bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                <Bell size={15} />
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-primary-foreground text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {NOTIFICATIONS.length}
                </span>
              </button>
              {showNotifs && (
                <div className="absolute top-full right-0 mt-2 w-[300px] bg-white border border-border rounded-2xl shadow-xl overflow-hidden z-30">
                  <div className="px-4 py-2.5 border-b border-border/60 text-xs font-bold text-foreground">Notifications</div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {NOTIFICATIONS.map((n) => (
                      <div key={n.id} className="p-3 border-b border-border/60 last:border-0 hover:bg-muted/40">
                        <div className="text-xs font-semibold text-foreground">{n.text}</div>
                        <div className="text-[9px] text-muted-foreground mt-1">{n.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* View Content - Zero Page Scrollbar */}
        <main className="flex-1 p-3.5 lg:p-5 min-w-0 overflow-y-auto flex flex-col">{children}</main>
      </div>
    </div>
  );
}
