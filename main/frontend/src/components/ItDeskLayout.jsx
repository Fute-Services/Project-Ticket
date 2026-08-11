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
  Search,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Film,
  Calendar,
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
  { id: 3, text: 'VPN request approved for John Doe', time: '2 hr ago' },
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
];

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDateStr(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function MiniCalendar({ selectedDate, onSelect }) {
  const initial = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="w-[240px]">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={goPrevMonth}
          aria-label="Previous month"
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground cursor-pointer"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-semibold text-foreground">{monthLabel}</span>
        <button
          type="button"
          onClick={goNextMonth}
          aria-label="Next month"
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground cursor-pointer"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} className="text-[9px] text-center text-muted-foreground font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dateStr = toDateStr(viewYear, viewMonth, d);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(dateStr)}
              className={`w-7 h-7 rounded-lg text-[11px] flex items-center justify-center cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : isToday
                  ? 'border border-primary/50 text-foreground hover:bg-accent'
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ItDeskLayout({ activeTab, setActiveTab, children, searchIndex = [], role = 'it', approvalCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        weekday: 'short',
      })
    : 'Select date';

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row font-sans selection:bg-primary/30 selection:text-primary">
      {/* Left Sidebar — Fixed Height with Zero Scrollbar */}
      <aside
        className={`${
          // `w-auto`, not `w-full`: the sidebar also carries `m-3`, so a full
          // 100% width plus 12px of margin each side pushed the page 12px wider
          // than the viewport and gave every phone a horizontal scrollbar.
          // As a block element `w-auto` already fills the row minus its margins.
          collapsed ? 'w-auto lg:w-[64px]' : 'w-auto lg:w-[195px] xl:w-[200px]'
        } m-3 lg:h-[calc(100vh-1.5rem)] lg:sticky lg:top-3 bg-background border border-border rounded-lg flex flex-col justify-between shrink-0 p-3 transition-all duration-300 overflow-hidden`}
      >
        <div>
          {/* Brand Header */}
          {!collapsed && (
            <div className="px-3 py-2 mb-3 border-b border-border">
              <div className="font-bold text-sm tracking-tight text-foreground leading-none">
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
                      ? 'bg-primary text-primary-foreground shadow border border-primary/40 font-semibold'
                      : 'bg-muted text-muted-foreground border border-border hover:border-muted-foreground/40 hover:text-foreground hover:bg-accent'
                  }`}
                  title={item.label}
                >
                  <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                    <Icon size={16} className={isActive ? 'text-primary-foreground' : 'text-muted-foreground'} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!collapsed && item.badge && (
                    <span className={`w-4 h-4 rounded-full font-bold text-[9px] flex items-center justify-center shrink-0 ${isActive ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="flex flex-col gap-2 pt-3 border-t border-border">
          {/* User Profile Card */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className={`w-full flex items-center rounded-xl bg-muted border border-border hover:border-muted-foreground/40 transition-colors cursor-pointer ${
                collapsed ? 'justify-center p-1.5' : 'justify-between p-2.5'
              }`}
            >
              <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                <div className="relative flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'J'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary border-2 border-muted" />
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {user?.full_name || 'John Anderson'}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {ROLE_LABEL[user?.role] || 'IT Manager'}
                    </div>
                  </div>
                )}
              </div>
              {!collapsed && <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
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

          {/* Collapse Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="w-full p-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 text-xs font-medium transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!collapsed && <span>Collapse Menu</span>}
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen max-h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border border-border/60 rounded-xl mx-3 mt-3 px-4 lg:px-6 flex items-center justify-between shrink-0 bg-card/60 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10)] sticky top-3 z-30">
          {/* Search Box */}
          <div className="relative flex items-center">
            <Search size={15} className="absolute left-3.5 text-muted-foreground pointer-events-none z-10" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tickets, requests, approvals..."
              className="h-9 bg-muted backdrop-blur-md border border-border rounded-xl pl-9 pr-4 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:bg-muted w-[260px] sm:w-[320px] transition-colors"
            />
            {results.length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-[320px] bg-muted border border-border rounded-xl shadow-xl overflow-hidden z-30">
                {results.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToResult(r.tab)}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-accent transition-colors cursor-pointer border-b border-border last:border-0"
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
                className="relative w-9 h-9 rounded-xl bg-muted backdrop-blur-md border border-border hover:bg-accent hover:border-muted-foreground/40 text-muted-foreground transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                <Bell size={15} />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-primary-foreground text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-background">
                  {NOTIFICATIONS.length}
                </span>
              </button>
              {showNotifs && (
                <div className="absolute top-full right-0 mt-2 w-[300px] bg-muted border border-border rounded-lg shadow-xl overflow-hidden z-30">
                  <div className="px-4 py-2.5 border-b border-border text-xs font-bold text-foreground">Notifications</div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {NOTIFICATIONS.map((n) => (
                      <div key={n.id} className="p-3 border-b border-border last:border-0 hover:bg-accent">
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

        {/* View Content — Zero Page Scrollbar */}
        <main className="flex-1 p-3 lg:p-4 min-w-0 overflow-y-auto flex flex-col h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)]">
          {/* Date Picker — shown above content on every IT dashboard page */}
          <div className="flex items-center justify-end gap-2.5 mb-3 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDatePicker((p) => !p)}
                className="h-9 flex items-center gap-2 px-3 rounded-xl bg-muted backdrop-blur-md border border-border hover:bg-accent hover:border-muted-foreground/40 text-xs text-muted-foreground font-medium shrink-0 cursor-pointer transition-colors"
              >
                <Calendar size={13} className="text-primary" />
                <span>{selectedDateLabel}</span>
                <ChevronDown size={11} className="text-muted-foreground" />
              </button>
              {showDatePicker && (
                <div className="absolute top-full right-0 mt-2 p-3 bg-muted border border-border rounded-xl shadow-xl z-30">
                  <MiniCalendar
                    selectedDate={selectedDate}
                    onSelect={(dateStr) => {
                      setSelectedDate(dateStr);
                      setShowDatePicker(false);
                    }}
                  />
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate('');
                        setShowDatePicker(false);
                      }}
                      className="mt-2 w-full text-[11px] text-muted-foreground hover:text-foreground text-center cursor-pointer"
                    >
                      Clear date
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
