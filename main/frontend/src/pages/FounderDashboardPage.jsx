import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApprovals } from '../context/ApprovalContext';
import { useLeave } from '../context/LeaveContext';
import { useHrDesk } from '../context/HrDeskContext';
import { useSalesDesk } from '../context/SalesDeskContext';
import { useTaskProject } from '../context/TaskProjectContext';
import {
  Bell,
  Users,
  Cpu,
  TrendingUp,
  Code2,
  Megaphone,
  Palette,
  Factory,
  Crown,
  CheckCircle,
  FolderKanban,
  BarChart2,
  Clock,
  Calendar,
  MessageSquareCode,
  Sparkles,
  ChevronDown,
  LogOut,
  Menu,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import TeamChatDrawer from '../components/TeamChatDrawer';
import FounderApprovalView from '../components/FounderApprovalView';
import FounderReportsView from '../components/FounderReportsView';
import FounderHrView from '../components/FounderHrView';
import FounderItView from '../components/FounderItView';
import FounderDeptView from '../components/FounderDeptView';
import FounderAiAdvisorView from '../components/FounderAiAdvisorView';
import { usePermissions } from '../context/PermissionsContext';
import { DEPT_DEMO } from '../data/deptDemoData';
import { tint } from '../styles/seriesColors';
import { employees, candidates, attendanceRecords } from '../data/hrMockData';

// One accent hex per department - used as a left-border stripe and tinted
// icon badge instead of a full gradient fill, so a department reads as
// "this is HR" at a glance without every card looking like a lit-up tile.
const DEPT_ACCENT = {
  hr: 'hsl(var(--chart-1))',
  it: 'hsl(var(--chart-2))',
  sales: 'hsl(var(--chart-3))',
  developers: 'hsl(var(--chart-4))',
  marketing: 'hsl(var(--chart-5))',
  branding: 'hsl(var(--chart-6))',
  /* Seven departments, six ramp steps - production doubles up with HR.
     They never appear adjacent in the grid, so the repeat isn't visible. */
  production: 'hsl(var(--chart-1))',
};



export default function FounderDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [activeDept, setActiveDept] = useState(location.state?.activeDept || 'overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const departments = [
    {
      id: 'overview',
      label: 'Founder Overview',
      shortLabel: 'Overview',
      icon: Crown,
      gradient: 'from-warning via-primary to-destructive',
      welcomeMsg: 'Welcome, Founder. This is your personal executive space.',
      tagColor: 'text-warning border-warning/20 bg-warning/10',
    },
    {
      id: 'hr',
      label: 'HR Department',
      shortLabel: 'HR',
      icon: Users,
      gradient: 'from-muted to-muted',
      welcomeMsg: 'Welcome to the HR Department Hub! Here you can manage recruitment, employees, leaves, and attendance.',
      tagColor: 'text-muted-foreground border-muted/20 bg-muted/10',
    },
    {
      id: 'it',
      label: 'IT Service Desk',
      shortLabel: 'IT',
      icon: Cpu,
      gradient: 'from-muted to-primary',
      welcomeMsg: 'Welcome to the IT Service Desk! Manage infrastructure, support tickets, system access, and assets.',
      tagColor: 'text-muted-foreground border-muted/20 bg-muted/10',
    },
    {
      id: 'sales',
      label: 'Sales Operations',
      shortLabel: 'Sales',
      icon: TrendingUp,
      gradient: 'from-primary to-primary',
      welcomeMsg: 'Welcome to the Sales Operations Hub! Track revenue pipeline, deal stages, client leads, and conversions.',
      tagColor: 'text-primary border-primary/20 bg-primary/10',
    },
    {
      id: 'developers',
      label: 'Developer Portal',
      shortLabel: 'Developers',
      icon: Code2,
      gradient: 'from-muted to-muted',
      welcomeMsg: 'Welcome to the Developer Portal! Monitor code repositories, sprint tasks, deployment builds, and API status.',
      tagColor: 'text-muted-foreground border-muted/20 bg-muted/10',
    },
    {
      id: 'marketing',
      label: 'Marketing Suite',
      shortLabel: 'Marketing',
      icon: Megaphone,
      gradient: 'from-primary to-warning',
      welcomeMsg: 'Welcome to the Marketing Suite! Manage campaigns, lead generation channels, social reach, and analytics.',
      tagColor: 'text-primary border-primary/20 bg-primary/10',
    },
    {
      id: 'branding',
      label: 'Branding Hub',
      shortLabel: 'Branding',
      icon: Palette,
      gradient: 'from-muted to-destructive',
      welcomeMsg: 'Welcome to the Branding Hub! Organize brand assets, design guidelines, creative media, and press kits.',
      tagColor: 'text-muted-foreground border-muted/20 bg-muted/10',
    },
    {
      id: 'production',
      label: 'Production Floor',
      shortLabel: 'Production',
      icon: Factory,
      gradient: 'from-muted to-primary',
      welcomeMsg: 'Welcome to the Production Floor! Track delivery schedules, capacity, and job quality.',
      tagColor: 'text-muted-foreground border-muted/20 bg-muted/10',
    },
    {
      id: 'approvals',
      label: 'Approval System',
      shortLabel: 'Approvals',
      icon: CheckCircle,
      gradient: 'from-muted via-muted to-muted',
      welcomeMsg: 'Manage all company approvals',
      tagColor: 'text-muted-foreground border-muted/20 bg-muted/10',
    },
    {
      id: 'projects',
      label: 'Project Details',
      shortLabel: 'Projects',
      icon: FolderKanban,
      gradient: 'from-muted via-muted to-muted',
      welcomeMsg: 'View cross-department project details',
      tagColor: 'text-muted-foreground border-muted/20 bg-muted/10',
    },
    {
      id: 'ai-agents',
      label: 'AI Agent Command Room',
      shortLabel: 'AI Agents',
      icon: Sparkles,
      gradient: 'from-primary via-primary-hover to-[#0C3515]',
      welcomeMsg: 'Ask AI Agents to collaborate and report the status of all departments.',
      tagColor: 'text-primary border-primary/20 bg-primary/10',
    },
    {
      id: 'reports',
      label: 'Reports',
      shortLabel: 'Reports',
      icon: BarChart2,
      gradient: 'from-muted via-muted to-muted',
      welcomeMsg: 'Cross-department analytics and reports',
      tagColor: 'text-muted-foreground border-muted/20 bg-muted/10',
    },
    {
      id: 'chat',
      label: 'Team Chat Hub',
      shortLabel: 'Team Chat',
      icon: MessageSquareCode,
      gradient: 'from-muted via-muted to-muted',
      welcomeMsg: 'Real-time company-wide chat & channel discussions',
      tagColor: 'text-muted-foreground border-muted/20 bg-muted/10',
    },
  ];

  const currentDept = departments.find((d) => d.id === activeDept) || departments[0];

  // Same sidebar shape as every other dashboard (HrLayout, CoordinatorLayout,
  // ItDeskLayout): a fixed nav list of icon+label rows. Founder switches
  // between views via activeDept rather than real routes, so "navigating"
  // here means setActiveDept, not react-router's navigate(). AI Agent Hub
  // isn't in this list - it keeps its own "Fute AI+" entry point.
  const SIDEBAR_ORDER = ['overview', 'approvals', 'projects', 'reports', 'hr', 'it', 'sales', 'developers', 'marketing', 'branding', 'production', 'chat'];
  const { canAccess } = usePermissions();
  const sidebarItems = SIDEBAR_ORDER.map((id) => departments.find((d) => d.id === id))
    .filter(Boolean)
    .filter((d) => canAccess('founder', d.id));

  // A page Super Admin revokes while Founder is sitting on it shouldn't
  // leave them stranded there - same pattern as ItDeskLayout/HrLayout.
  useEffect(() => {
    if (sidebarItems.length && !sidebarItems.some((d) => d.id === activeDept)) {
      setActiveDept(sidebarItems[0].id);
    }
  }, [sidebarItems, activeDept]);

  function goToDept(id) {
    setActiveDept(id);
    setMobileNavOpen(false);
  }

  function handleSignOut() {
    logout();
    navigate('/', { replace: true });
  }

  const { approvals, decide } = useApprovals();
  const pendingApprovals = approvals.filter((a) => a.status === 'pending_founder');

  const { leaveRequests, decide: decideLeave } = useLeave();
  const pendingLeaves = leaveRequests.filter((l) => l.status === 'Pending');

  const { tasks: allTasks, projects: allProjects } = useTaskProject();

  // Founder's own rollup (Founder's Own View gap) - real data, same
  // HrDeskContext every HR page already shares (founder is already granted
  // read access there), just not surfaced on this dashboard until now.
  const { employees: hrEmployees, attendanceRecords: hrAttendance, extraHours: hrExtraHours } = useHrDesk();
  const { leads: salesLeads } = useSalesDesk();
  const pendingDocsAndHours = approvals.filter(
    (a) => a.status === 'pending_founder' && ['document', 'extra-hours'].includes(a.category)
  );
  const thisMonthPrefix = new Date().toISOString().slice(0, 7);
  const leaveTakenThisMonth = hrAttendance.filter((a) => a.status === 'Leave' && a.date?.startsWith(thisMonthPrefix)).length;
  const extraHoursThisMonth = hrExtraHours
    .filter((e) => e.date?.startsWith(thisMonthPrefix))
    .reduce((sum, e) => sum + (e.hours || 0), 0);

  const salesContactedThisMonth = salesLeads.filter(
    (l) => l.status && l.status !== 'Yet to be Called' && String(l.updated_at || l.created_at || '').startsWith(thisMonthPrefix)
  ).length;
  const salesMeetingsArranged = salesLeads.filter((l) => l.status === 'Meeting Arranged' || l.status === 'Converted').length;
  const salesActiveReps = new Set(salesLeads.map((l) => l.assignedTo).filter(Boolean)).size;

  return (
    <div className="min-h-screen bg-[#090f0c] text-foreground flex font-sans selection:bg-primary/30 selection:text-primary p-2.5 lg:p-3 gap-3 overflow-x-hidden">
      {/* Sidebar - same fixed-height, collapsible, mobile-drawer pattern as
          every other dashboard (HrLayout, CoordinatorLayout, ItDeskLayout). */}
      <aside
        className={`fixed lg:sticky top-3 left-3 lg:left-auto z-40 ${
          collapsed ? 'w-[195px] lg:w-[64px]' : 'w-[195px] xl:w-[200px]'
        } h-[calc(100vh-1.5rem)] sidebar-glass rounded-2xl flex flex-col justify-between shrink-0 p-3 overflow-hidden transition-all duration-300 lg:translate-x-0 shadow-2xl text-white ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {!collapsed && (
            <div className="px-3 py-2 mb-3 border-b border-white/10">
              <div className="font-bold text-sm tracking-tight text-white leading-none">
                Founder
              </div>
            </div>
          )}

          <nav className="flex flex-col gap-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeDept === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToDept(item.id)}
                  title={collapsed ? item.shortLabel : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`mx-1 flex items-center py-2 px-2.5 rounded-lg text-[11px] font-mono font-bold tracking-wider uppercase transition-all duration-200 text-left cursor-pointer ${
                    collapsed ? 'lg:justify-center lg:px-0 gap-2.5' : 'gap-2.5'
                  } ${
                    isActive
                      ? 'bg-white/[0.14] text-white shadow-sm border border-white/20 font-semibold backdrop-blur-md'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.07] border border-transparent'
                  }`}
                >
                  <Icon size={14} className={`shrink-0 ${isActive ? 'text-emerald-400' : 'text-white/60'}`} />
                  <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.shortLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-2 pt-3 border-t border-white/10 shrink-0">
          {/* Fute AI+ */}
          <button
            type="button"
            onClick={() => goToDept('ai-agents')}
            title={collapsed ? 'Fute AI+' : undefined}
            aria-current={activeDept === 'ai-agents' ? 'page' : undefined}
            className={`mx-1 flex items-center py-2 rounded-lg text-[11px] font-mono font-bold tracking-wider uppercase transition-all duration-200 text-left cursor-pointer bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-950/40 ${
              collapsed ? 'lg:justify-center lg:px-0 gap-2.5 px-2.5' : 'gap-2.5 px-2.5'
            } ${activeDept === 'ai-agents' ? 'ring-2 ring-emerald-400' : ''}`}
          >
            <Sparkles size={14} className="shrink-0" />
            <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>Fute AI+</span>
          </button>

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
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'F'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0c1611]" />
                </div>
                <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
                  <div className="text-xs font-semibold text-white truncate">{user?.full_name || 'Founder'}</div>
                  <div className="text-[10px] text-white/50 truncate">Founder</div>
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

          {/* Collapse toggle */}
          <button
            type="button"
            onClick={() => setCollapsed((p) => !p)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex w-full p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white items-center justify-center gap-2 text-xs font-medium transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 bg-background/80 z-30 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* Main Workspace Column - Framed Rounded Tablet Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-1.5rem)] bg-[#eaf3ec] rounded-[24px] lg:rounded-[28px] border border-white/10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Top Bar inside rounded canvas */}
        <header className="h-14 border-b border-border/70 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-[#eaf3ec]/85 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-1.5 rounded-lg bg-muted border border-border text-muted-foreground cursor-pointer shrink-0 mr-1"
            >
              <Menu size={14} />
            </button>
            <span>Founder</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-foreground">{currentDept.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNotifs((p) => !p)}
              className="relative w-9 h-9 rounded-full bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            >
              <Bell size={14} />
              {(pendingApprovals.length + pendingLeaves.length) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center border-2 border-white">
                  {pendingApprovals.length + pendingLeaves.length}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'F'}
              </div>
              <span className="hidden sm:block text-xs font-semibold text-foreground">{user?.full_name || 'Founder'}</span>
            </div>
          </div>
        </header>

        {showNotifs && (
          <div className="absolute top-14 right-4 z-50 w-[320px] apple-glass rounded-2xl shadow-2xl overflow-hidden border border-white/80 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 py-3 border-b border-black/5 text-xs font-bold text-foreground flex items-center justify-between">
              <span>Needs your attention</span>
              {(pendingApprovals.length + pendingLeaves.length) > 0 && (
                <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {pendingApprovals.length + pendingLeaves.length} pending
                </span>
              )}
            </div>
            <div className="max-h-[280px] overflow-y-auto">
              {pendingApprovals.length === 0 && pendingLeaves.length === 0 ? (
                <div className="py-7 text-center flex flex-col items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center mb-2 text-emerald-600">
                    <CheckCircle size={18} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Nothing waiting on you.</p>
                </div>
              ) : (
                <>
                  {pendingApprovals.map((a) => (
                    <button key={`a-${a.id}`} type="button" onClick={() => { setActiveDept('approvals'); setShowNotifs(false); }} className="w-full text-left px-4 py-2.5 border-b border-black/5 last:border-0 hover:bg-white/40 cursor-pointer transition-colors">
                      <div className="text-xs font-semibold text-foreground">{a.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Approval · {a.source}</div>
                    </button>
                  ))}
                  {pendingLeaves.map((l) => (
                    <button key={`l-${l.id}`} type="button" onClick={() => { setActiveDept('approvals'); setShowNotifs(false); }} className="w-full text-left px-4 py-2.5 border-b border-black/5 last:border-0 hover:bg-white/40 cursor-pointer transition-colors">
                      <div className="text-xs font-semibold text-foreground">{l.employee}'s leave request</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Leave · {l.type}</div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Main Workspace Body */}
        <main className="flex-1 p-3.5 lg:p-5 min-w-0 overflow-y-auto flex flex-col gap-6">
        {/* Dynamic Container View - Overview Hero Page */}
        {activeDept === 'overview' ? (
          <div className="w-full flex flex-col gap-4">
            {/* Top: Digital Clock */}
            <div className="grid grid-cols-1 gap-3 items-stretch">
              {/* Digital Clock Card */}
              <div className="w-full lg:w-72 bg-gradient-to-br from-primary via-primary-hover to-[#0C3515] text-white border border-primary/40 rounded-2xl p-4 flex flex-col justify-between items-center text-center relative overflow-hidden shadow-lg shadow-primary/20 group hover:shadow-primary/30 transition-all">
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex items-center gap-1.5 text-xs text-white/90 font-semibold uppercase tracking-wider">
                    <Clock size={14} className="text-white animate-pulse" />
                    <span>System Clock</span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full border border-white/30 backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LIVE
                  </span>
                </div>

                <div className="my-auto py-2 flex flex-col items-center">
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono drop-shadow-md">
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/90 font-medium mt-1.5">
                    <Calendar size={13} className="text-white/80" />
                    <span>{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                <div className="w-full border-t border-white/20 pt-2.5 flex justify-between items-center text-[11px] text-white/80">
                  <span>Timezone</span>
                  <span className="font-semibold text-white font-mono">IST (UTC+5:30)</span>
                </div>
              </div>
            </div>

            {/* HR Portal Rollup - Founder's own view into Employee Details,
                Leave, Performance, Documents, Attendance/Extra Hours */}
            <div className="w-full">
              <h2 className="text-xs font-bold text-muted-foreground mb-2.5 uppercase tracking-wider">HR Portal</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-2xl p-3.5">
                  <div className="text-2xl font-extrabold text-foreground">{hrEmployees.length}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Employees</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3.5">
                  <div className="text-2xl font-extrabold text-foreground">{pendingDocsAndHours.length}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Pending sign-off<br />(docs + extra hours)</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3.5">
                  <div className="text-2xl font-extrabold text-foreground">{leaveTakenThisMonth}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Leave days taken<br />this month, org-wide</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3.5">
                  <div className="text-2xl font-extrabold text-foreground">{extraHoursThisMonth}h</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Extra hours logged<br />this month, org-wide</div>
                </div>
              </div>
            </div>

            {/* Sales Desk Rollup - Founder's own view into the Sales
                Directory (leads, pipeline, reps), same shared SalesDeskContext
                the Sales role's own Overview/Directory pages read. */}
            <div className="w-full">
              <h2 className="text-xs font-bold text-muted-foreground mb-2.5 uppercase tracking-wider">Sales Desk</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-2xl p-3.5">
                  <div className="text-2xl font-extrabold text-foreground">{salesLeads.length}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Leads in the directory</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3.5">
                  <div className="text-2xl font-extrabold text-foreground">{salesContactedThisMonth}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Leads contacted<br />this month</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3.5">
                  <div className="text-2xl font-extrabold text-foreground">{salesMeetingsArranged}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Meetings arranged<br />or converted</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3.5">
                  <div className="text-2xl font-extrabold text-foreground">{salesActiveReps}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Active reps</div>
                </div>
              </div>
            </div>

            {/* Executive Tools */}
            <div className="w-full">
              <h2 className="text-xs font-bold text-muted-foreground mb-2.5 uppercase tracking-wider">Executive Tools</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'approvals', label: 'Approvals', icon: CheckCircle, tint: 'hsl(var(--chart-4))' },
                  { id: 'projects', label: 'Project Details', icon: FolderKanban, tint: 'hsl(var(--chart-3))' },
                  { id: 'reports', label: 'Reports', icon: BarChart2, tint: 'hsl(var(--chart-2))' },
                ].map((tool) => {
                  const ToolIcon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setActiveDept(tool.id)}
                      className="bg-card border border-border rounded-2xl p-2.5 text-left hover:border-muted-foreground/40 transition-all cursor-pointer flex items-center gap-2.5"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: tint(tool.tint, 0.1), color: tool.tint }}
                      >
                        <ToolIcon size={15} />
                      </div>
                      <span className="text-xs font-bold text-foreground">{tool.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Departments Grid */}
            <div className="w-full">
              <h2 className="text-xs font-bold text-muted-foreground mb-2.5 uppercase tracking-wider">All Departments</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {departments.filter(d => ['hr', 'it', 'sales', 'developers', 'marketing', 'branding', 'production'].includes(d.id)).map((dept) => {
                  const DeptIcon = dept.icon;
                  return (
                    <button
                      key={dept.id}
                      onClick={() => setActiveDept(dept.id)}
                      className="bg-card border border-border rounded-2xl p-4 text-left hover:border-muted-foreground/40 hover:bg-accent transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 text-foreground">
                          <DeptIcon size={18} />
                        </div>
                        <h3 className="text-xs font-bold text-foreground leading-none">{dept.label}</h3>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-3 min-h-[1.5rem] leading-normal">{dept.welcomeMsg.split('!')[0]}!</p>
                        <div className="flex items-center justify-between pt-1.5 border-t border-border">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${dept.tagColor}`}>Active</span>
                          <span className="text-muted-foreground group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeDept === 'approvals' ? (
          /* Dual-Panel IT & HR Approval System View */
          <FounderApprovalView />
        ) : activeDept === 'projects' ? (
          /* Project Details View */
          <div className="w-full flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-muted/10 flex items-center justify-center text-muted-foreground border border-muted/20 shrink-0">
                <FolderKanban size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Project Details</h2>
                <p className="text-xs text-muted-foreground">Who's working on what, across every active project</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allProjects.map((p) => {
                const projectTasks = allTasks.filter((t) => t.projectId === p.id);
                const done = projectTasks.filter((t) => t.status === 'Completed').length;
                return (
                  <div key={p.id} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
                    <div>
                      <div className="text-sm font-bold text-foreground truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.client} · due {p.dueDate}</div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">{done}/{projectTasks.length} tasks done</span>
                        <span className="font-bold text-foreground">{p.progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.members.map((m) => (
                        <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">{m}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeDept === 'reports' ? (
          /* Weekly and Monthly Reports View */
          <FounderReportsView />
        ) : activeDept === 'ai-agents' ? (
          /* AI Agent Hub View */
          <FounderAiAdvisorView onNavigate={setActiveDept} />
        ) : activeDept === 'chat' ? (
          /* Full Page Team Chat Hub View */
          <TeamChatDrawer isFullPage={true} />
        ) : activeDept === 'hr' ? (
          /* HR Department View */
          <FounderHrView />
        ) : activeDept === 'it' ? (
          /* IT Service Desk View */
          <FounderItView />
        ) : DEPT_DEMO[activeDept] ? (
          /* Sales / Developers / Marketing / Branding / Production - demo data,
             labelled as such inside the view so it can't read as live numbers */
          <FounderDeptView dept={currentDept} />
        ) : (
          /* Not built yet - an honest empty state, not a generic filler message */
          <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center justify-center text-center min-h-[320px]">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: tint(DEPT_ACCENT[currentDept.id] || 'hsl(var(--chart-3))', 0.1), color: DEPT_ACCENT[currentDept.id] || 'hsl(var(--chart-3))' }}
            >
              <currentDept.icon size={22} />
            </div>
            <h2 className="text-base font-bold text-foreground mb-1.5">{currentDept.label} isn't set up yet</h2>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-5">
              {currentDept.welcomeMsg} This section doesn't have real data connected yet.
            </p>
            <button
              type="button"
              onClick={() => setActiveDept('overview')}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              ← Back to Overview
            </button>
          </div>
        )}
      </main>

      </div>
    </div>
  );
}
