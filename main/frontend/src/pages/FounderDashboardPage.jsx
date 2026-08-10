import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApprovals } from '../context/ApprovalContext';
import { useLeave } from '../context/LeaveContext';
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
import { DEPT_DEMO } from '../data/deptDemoData';
import { tint } from '../styles/seriesColors';
import { employees, candidates, attendanceRecords } from '../data/hrMockData';

// One accent hex per department — used as a left-border stripe and tinted
// icon badge instead of a full gradient fill, so a department reads as
// "this is HR" at a glance without every card looking like a lit-up tile.
const DEPT_ACCENT = {
  hr: 'hsl(var(--chart-1))',
  it: 'hsl(var(--chart-2))',
  sales: 'hsl(var(--chart-3))',
  developers: 'hsl(var(--chart-4))',
  marketing: 'hsl(var(--chart-5))',
  branding: 'hsl(var(--chart-6))',
  /* Seven departments, six ramp steps — production doubles up with HR.
     They never appear adjacent in the grid, so the repeat isn't visible. */
  production: 'hsl(var(--chart-1))',
};

// Leadership bios are short original summaries, not copied text — matches
// the public team page at futeservices.com (name, title, one-line focus).
const LEADERSHIP_TEAM = [
  {
    name: 'Ratish Kovvammal',
    title: 'Founder & CEO',
    initials: 'RK',
    gradient: 'from-primary to-warning',
    photo: '/team-ratish.webp',
    bio: '14+ years across sales, marketing, software, and customer experience.',
  },
  {
    name: 'Payel Saha',
    title: 'Chief Operations Officer',
    initials: 'PS',
    gradient: 'from-muted to-muted',
    photo: '/team-payel.webp',
    bio: 'Leads day-to-day operations with a versatile, hands-on approach.',
  },
  {
    name: 'Soma',
    title: 'Managing Director',
    initials: 'S',
    gradient: 'from-muted to-destructive',
    photo: '/team-soma.webp',
    bio: 'Drives creative direction and seamless execution across projects.',
  },
];





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
      gradient: 'from-primary via-purple-500 to-indigo-500',
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
  // isn't in this list — it keeps its own "Fute AI+" entry point.
  const SIDEBAR_ORDER = ['overview', 'approvals', 'projects', 'reports', 'hr', 'it', 'sales', 'developers', 'marketing', 'branding', 'production', 'chat'];
  const sidebarItems = SIDEBAR_ORDER.map((id) => departments.find((d) => d.id === id)).filter(Boolean);

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

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary/30 selection:text-primary">
      {/* Sidebar — same fixed-height, collapsible, mobile-drawer pattern as
          every other dashboard (HrLayout, CoordinatorLayout, ItDeskLayout). */}
      <aside
        className={`fixed lg:sticky top-3 left-3 lg:left-auto lg:ml-3 z-40 ${
          collapsed ? 'w-[195px] lg:w-[64px]' : 'w-[195px] xl:w-[200px]'
        } h-[calc(100vh-1.5rem)] bg-background border border-border rounded-lg flex flex-col justify-between shrink-0 p-3 overflow-hidden transition-all duration-300 lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {!collapsed && (
            <div className="px-3 py-2 mb-3 border-b border-border">
              <div className="font-bold text-sm tracking-tight text-foreground leading-none">
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
                  className={`mx-1 flex items-center py-1.5 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all duration-200 text-left cursor-pointer ${
                    collapsed ? 'lg:justify-center lg:px-0 gap-2.5 px-2.5' : 'gap-2.5 px-2.5'
                  } ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow border border-primary/40 font-semibold'
                      : 'bg-muted text-muted-foreground border border-border hover:border-muted-foreground/40 hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon size={14} className={`shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.shortLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-2 pt-3 border-t border-border">
          {/* Fute AI+ — kept visually distinct from the regular nav rows,
              same emphasis it had as its own dock button. */}
          <button
            type="button"
            onClick={() => goToDept('ai-agents')}
            title={collapsed ? 'Fute AI+' : undefined}
            aria-current={activeDept === 'ai-agents' ? 'page' : undefined}
            className={`mx-1 flex items-center py-1.5 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all duration-200 text-left cursor-pointer bg-gradient-to-br from-primary via-purple-500 to-indigo-500 text-white shadow ${
              collapsed ? 'lg:justify-center lg:px-0 gap-2.5 px-2.5' : 'gap-2.5 px-2.5'
            } ${activeDept === 'ai-agents' ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : ''}`}
          >
            <Sparkles size={14} className="shrink-0" />
            <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>Fute AI+</span>
          </button>

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
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'F'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary border-2 border-muted" />
                </div>
                <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
                  <div className="text-xs font-semibold text-foreground truncate">{user?.full_name || 'Founder'}</div>
                  <div className="text-[10px] text-muted-foreground truncate">Founder</div>
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

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
      {/* Top Bar — breadcrumb, notifications, profile. */}
      <div className="sticky top-3 z-30 w-full max-w-[1700px] mx-auto px-4 lg:px-6 mt-3 shrink-0">
        <header className="h-12 rounded-full px-5 flex items-center justify-between border border-border/60 bg-card/60 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10)]">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pl-2">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-1.5 -ml-1 rounded-lg bg-muted border border-border text-muted-foreground cursor-pointer shrink-0 mr-1"
            >
              <Menu size={14} />
            </button>
            <span>Founder</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{currentDept.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNotifs((p) => !p)}
              className="relative w-8 h-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Bell size={14} />
              {(pendingApprovals.length + pendingLeaves.length) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center border-2 border-background">
                  {pendingApprovals.length + pendingLeaves.length}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'F'}
              </div>
              <span className="hidden sm:block text-xs font-semibold text-muted-foreground">{user?.full_name || 'Founder'}</span>
            </div>
          </div>
        </header>
      </div>

      {showNotifs && (
        <div className="fixed top-16 right-4 lg:right-6 z-40 w-[300px] bg-muted border border-border rounded-lg shadow-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-xs font-bold text-foreground">Needs your attention</div>
          <div className="max-h-[280px] overflow-y-auto">
            {pendingApprovals.length === 0 && pendingLeaves.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Nothing waiting on you.</p>
            ) : (
              <>
                {pendingApprovals.map((a) => (
                  <button key={`a-${a.id}`} type="button" onClick={() => { setActiveDept('approvals'); setShowNotifs(false); }} className="w-full text-left px-4 py-2.5 border-b border-border last:border-0 hover:bg-accent cursor-pointer">
                    <div className="text-xs font-semibold text-foreground">{a.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Approval · {a.source}</div>
                  </button>
                ))}
                {pendingLeaves.map((l) => (
                  <button key={`l-${l.id}`} type="button" onClick={() => { setActiveDept('approvals'); setShowNotifs(false); }} className="w-full text-left px-4 py-2.5 border-b border-border last:border-0 hover:bg-accent cursor-pointer">
                    <div className="text-xs font-semibold text-foreground">{l.employee}'s leave request</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Leave · {l.type}</div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="flex-1 p-4 lg:p-6 pb-10 max-w-[1700px] w-full mx-auto flex flex-col gap-6">
        {/* Dynamic Container View - Overview Hero Page */}
        {activeDept === 'overview' ? (
          <div className="w-full flex flex-col gap-4">
            {/* Top: Founder + Leadership Team Header */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-stretch">
              {/* Digital Clock Card - Orange Theme */}
              <div className="lg:col-span-1 bg-gradient-to-br from-orange-500 via-amber-600 to-orange-600 text-white border border-orange-400/40 rounded-2xl p-4 flex flex-col justify-between items-center text-center relative overflow-hidden shadow-lg shadow-orange-500/20 group hover:shadow-orange-500/30 transition-all">
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

              {/* Leadership Team - 3 columns */}
              <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-4 flex flex-col justify-between h-full">
                <h2 className="text-xs font-bold text-muted-foreground mb-2.5 uppercase tracking-wider">Leadership Team</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                  {LEADERSHIP_TEAM.map((person) => (
                    <div key={person.name} className="bg-muted border border-border rounded-2xl p-3.5 flex items-center gap-3 h-full hover:border-muted-foreground/40 transition-all">
                      {person.photo ? (
                        <img
                          src={person.photo}
                          alt={person.name}
                          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                          className="w-11 h-11 rounded-full object-cover shadow-lg border-2 border-border shrink-0"
                        />
                      ) : null}
                      <div
                        className={`w-11 h-11 rounded-full bg-gradient-to-tr ${person.gradient} items-center justify-center text-foreground text-xs font-semibold shadow-lg border-2 border-border shrink-0 ${person.photo ? 'hidden' : 'flex'}`}
                      >
                        {person.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-semibold text-foreground truncate">{person.name}</h3>
                        <span className="text-xs text-primary font-semibold block leading-tight">{person.title}</span>
                        <p className="text-xs text-muted-foreground leading-snug mt-1 line-clamp-3">{person.bio}</p>
                      </div>
                    </div>
                  ))}
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
          /* Sales / Developers / Marketing / Branding / Production — demo data,
             labelled as such inside the view so it can't read as live numbers */
          <FounderDeptView dept={currentDept} />
        ) : (
          /* Not built yet — an honest empty state, not a generic filler message */
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
