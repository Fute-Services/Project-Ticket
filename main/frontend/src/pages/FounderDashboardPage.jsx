import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApprovals } from '../context/ApprovalContext';
import { useLeave } from '../context/LeaveContext';
import { useTaskProject } from '../context/TaskProjectContext';
import {
  Building2,
  Bell,
  LogOut,
  ChevronDown,
  MessageSquare,
  Users,
  Cpu,
  TrendingUp,
  Code2,
  Megaphone,
  Palette,
  Sparkles,
  Crown,
  CheckCircle,
  Check,
  X,
  Clock,
  FolderKanban,
  Plane,
  BarChart2,
  Factory,
} from 'lucide-react';
import TeamChatDrawer from '../components/TeamChatDrawer';
import AppleDock from '../components/AppleDock';
import FounderApprovalView from '../components/FounderApprovalView';
import FounderReportsView from '../components/FounderReportsView';
import FounderHrView from '../components/FounderHrView';
import FounderItView from '../components/FounderItView';
import { employees, candidates, attendanceRecords } from '../data/hrMockData';

// Leadership bios are short original summaries, not copied text — matches
// the public team page at futeservices.com (name, title, one-line focus).
const LEADERSHIP_TEAM = [
  {
    name: 'Ratish Kovvammal',
    title: 'Founder & CEO',
    initials: 'RK',
    gradient: 'from-orange-500 to-amber-500',
    photo: '/team-ratish.webp',
    bio: '14+ years across sales, marketing, software, and customer experience.',
  },
  {
    name: 'Payel Saha',
    title: 'Chief Operations Officer',
    initials: 'PS',
    gradient: 'from-blue-500 to-indigo-500',
    photo: '/team-payel.webp',
    bio: 'Leads day-to-day operations with a versatile, hands-on approach.',
  },
  {
    name: 'Soma',
    title: 'Managing Director',
    initials: 'S',
    gradient: 'from-pink-500 to-rose-500',
    photo: '/team-soma.webp',
    bio: 'Drives creative direction and seamless execution across projects.',
  },
];





export default function FounderDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeDept, setActiveDept] = useState(location.state?.activeDept || 'overview');

  const departments = [
    {
      id: 'overview',
      label: 'Founder Overview',
      shortLabel: 'Overview',
      icon: Crown,
      gradient: 'from-amber-500 via-orange-500 to-red-500',
      welcomeMsg: 'Welcome, Founder. This is your personal executive space.',
      tagColor: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
    },
    {
      id: 'hr',
      label: 'HR Department',
      shortLabel: 'HR',
      icon: Users,
      gradient: 'from-blue-600 to-indigo-600',
      welcomeMsg: 'Welcome to the HR Department Hub! Here you can manage recruitment, employees, leaves, and attendance.',
      tagColor: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
    },
    {
      id: 'it',
      label: 'IT Service Desk',
      shortLabel: 'IT',
      icon: Cpu,
      gradient: 'from-cyan-600 to-teal-600',
      welcomeMsg: 'Welcome to the IT Service Desk! Manage infrastructure, support tickets, system access, and assets.',
      tagColor: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10',
    },
    {
      id: 'sales',
      label: 'Sales Operations',
      shortLabel: 'Sales',
      icon: TrendingUp,
      gradient: 'from-emerald-600 to-green-600',
      welcomeMsg: 'Welcome to the Sales Operations Hub! Track revenue pipeline, deal stages, client leads, and conversions.',
      tagColor: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
    },
    {
      id: 'developers',
      label: 'Developer Portal',
      shortLabel: 'Developers',
      icon: Code2,
      gradient: 'from-purple-600 to-fuchsia-600',
      welcomeMsg: 'Welcome to the Developer Portal! Monitor code repositories, sprint tasks, deployment builds, and API status.',
      tagColor: 'text-purple-400 border-purple-500/20 bg-purple-500/10',
    },
    {
      id: 'marketing',
      label: 'Marketing Suite',
      shortLabel: 'Marketing',
      icon: Megaphone,
      gradient: 'from-orange-600 to-amber-600',
      welcomeMsg: 'Welcome to the Marketing Suite! Manage campaigns, lead generation channels, social reach, and analytics.',
      tagColor: 'text-orange-400 border-orange-500/20 bg-orange-500/10',
    },
    {
      id: 'branding',
      label: 'Branding Hub',
      shortLabel: 'Branding',
      icon: Palette,
      gradient: 'from-pink-600 to-rose-600',
      welcomeMsg: 'Welcome to the Branding Hub! Organize brand assets, design guidelines, creative media, and press kits.',
      tagColor: 'text-pink-400 border-pink-500/20 bg-pink-500/10',
    },
    {
      id: 'approvals',
      label: 'Approval System',
      shortLabel: 'Approvals',
      icon: CheckCircle,
      gradient: 'from-violet-500 via-purple-500 to-indigo-500',
      welcomeMsg: 'Manage all company approvals',
      tagColor: 'text-purple-400 border-purple-500/20 bg-purple-500/10',
    },
    {
      id: 'projects',
      label: 'Project Details',
      shortLabel: 'Projects',
      icon: FolderKanban,
      gradient: 'from-purple-500 via-fuchsia-500 to-purple-600',
      welcomeMsg: 'View cross-department project details',
      tagColor: 'text-purple-400 border-purple-500/20 bg-purple-500/10',
    },
    {
      id: 'reports',
      label: 'Reports',
      shortLabel: 'Reports',
      icon: BarChart2,
      gradient: 'from-blue-500 via-cyan-500 to-blue-600',
      welcomeMsg: 'Cross-department analytics and reports',
      tagColor: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
    },
  ];

  const currentDept = departments.find((d) => d.id === activeDept) || departments[0];

  const { approvals, decide } = useApprovals();
  const pendingApprovals = approvals.filter((a) => a.status === 'pending_founder');

  const { leaveRequests, decide: decideLeave } = useLeave();
  const pendingLeaves = leaveRequests.filter((l) => l.status === 'Pending');

  const { tasks: allTasks, projects: allProjects } = useTaskProject();

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200 overflow-x-hidden">
      {/* Main Workspace Body */}
      <main className="flex-1 p-4 lg:p-6 pl-28 sm:pl-32 lg:pl-36 pb-10 max-w-[1700px] w-full mx-auto flex flex-col gap-6">


        {/* Dynamic Container View - Overview Hero Page */}
        {activeDept === 'overview' ? (
          <div className="w-full flex flex-col gap-4">
            {/* Top: Founder + Leadership Team Header */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-stretch">
              {/* Founder Profile - Compact */}
              <div className="lg:col-span-1 bg-[#141418] border border-white/10 rounded-2xl p-4 flex flex-col justify-between items-center text-center relative overflow-hidden group">
                <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-amber-500 to-orange-500 blur-2xl pointer-events-none" />
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-orange-500/20 border-2 border-white/20 mb-1.5 relative z-10">
                    F
                  </div>
                  <h3 className="text-xs font-black text-white leading-none">Founder</h3>
                  <span className="text-[9px] text-[#e86024] font-semibold mt-0.5">CEO</span>
                </div>
                <div className="w-full border-t border-white/5 my-2" />
                <div className="space-y-1.5 text-left w-full text-[10px]">
                  <div className="flex justify-between"><span className="text-gray-500">Founded:</span> <span className="text-white font-medium">2023</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">HQ:</span> <span className="text-white font-medium">Bangalore</span></div>
                  <div><span className="text-emerald-400 font-bold text-[10px]">● Active</span></div>
                </div>
              </div>

              {/* Leadership Team - 3 columns */}
              <div className="lg:col-span-3 bg-[#141418] border border-white/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden h-full">
                <h2 className="text-xs font-black text-white mb-2.5 uppercase tracking-wider">Leadership Team</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                  {LEADERSHIP_TEAM.map((person) => (
                    <div key={person.name} className="bg-[#1a1a20] border border-white/10 rounded-xl p-3.5 flex items-center gap-3 h-full hover:border-white/20 transition-all">
                      {person.photo ? (
                        <img
                          src={person.photo}
                          alt={person.name}
                          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                          className="w-11 h-11 rounded-full object-cover shadow-lg border-2 border-white/20 shrink-0"
                        />
                      ) : null}
                      <div
                        className={`w-11 h-11 rounded-full bg-gradient-to-tr ${person.gradient} items-center justify-center text-white text-xs font-black shadow-lg border-2 border-white/20 shrink-0 ${person.photo ? 'hidden' : 'flex'}`}
                      >
                        {person.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-black text-white truncate">{person.name}</h3>
                        <span className="text-[10px] text-[#e86024] font-semibold block leading-tight">{person.title}</span>
                        <p className="text-[10px] text-gray-300 leading-snug mt-1 line-clamp-3">{person.bio}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Executive Tools */}
            <div className="w-full">
              <h2 className="text-xs font-black text-white mb-2.5 uppercase tracking-wider">Executive Tools</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'approvals', label: 'Approvals', icon: CheckCircle, gradient: 'from-violet-500 to-purple-500' },
                  { id: 'projects', label: 'Project Details', icon: FolderKanban, gradient: 'from-purple-500 to-fuchsia-500' },
                  { id: 'reports', label: 'Reports', icon: BarChart2, gradient: 'from-blue-500 to-cyan-500' },
                ].map((tool) => {
                  const ToolIcon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setActiveDept(tool.id)}
                      className="bg-[#141418] border border-white/10 rounded-2xl p-2.5 text-left hover:border-white/20 transition-all cursor-pointer flex items-center gap-2.5"
                    >
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${tool.gradient} flex items-center justify-center text-white shrink-0 shadow-lg border border-white/10`}>
                        <ToolIcon size={15} />
                      </div>
                      <span className="text-[11px] font-extrabold text-white">{tool.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Company Vision & Overview */}
            <div className="w-full">
              <h2 className="text-xs font-black text-white mb-2.5 uppercase tracking-wider">Company Vision</h2>
              <div className="bg-[#141418] border border-white/10 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-orange-500 to-red-500 blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col justify-center">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-wider mb-1">Company</h4>
                  <p className="text-[11px] text-gray-300 leading-relaxed">Fute Services - Building next-generation digital workspaces with unified governance across all departments.</p>
                </div>
                <div className="relative z-10 flex flex-col justify-center">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-wider mb-1">Vision</h4>
                  <p className="text-[11px] text-orange-400/90 font-semibold italic leading-relaxed">"Empowering collaborative engineering, compliant HR, and high SLA compliance."</p>
                </div>
              </div>
            </div>

            {/* Main Departments Grid */}
            <div className="w-full">
              <h2 className="text-xs font-black text-white mb-2.5 uppercase tracking-wider">All Departments</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {departments.filter(d => ['hr', 'it', 'sales', 'developers', 'marketing', 'branding'].includes(d.id)).map((dept) => {
                  const DeptIcon = dept.icon;
                  return (
                    <button
                      key={dept.id}
                      onClick={() => setActiveDept(dept.id)}
                      className={`bg-[#141418] border border-white/10 rounded-2xl p-4 text-left hover:border-white/20 transition-all cursor-pointer group relative overflow-hidden`}
                    >
                      {/* Subtle gradient background */}
                      <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${dept.gradient} blur-2xl pointer-events-none`} />

                      {/* Content */}
                      <div className="relative z-10">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${dept.gradient} flex items-center justify-center text-white mb-2.5 shadow-lg shadow-black/30 border border-white/10 group-hover:shadow-xl group-hover:scale-105 transition-all`}>
                          <DeptIcon size={20} />
                        </div>
                        <h3 className="text-xs font-black text-white mb-0.5 leading-none">{dept.label}</h3>
                        <p className="text-[10px] text-gray-400 mb-3 min-h-[1.5rem] leading-normal">{dept.welcomeMsg.split('!')[0]}!</p>
                        <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${dept.tagColor}`}>Active</span>
                          <span className="text-gray-500 group-hover:translate-x-1 transition-transform">→</span>
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg border border-white/10">
                <FolderKanban size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Project Details</h2>
                <p className="text-xs text-gray-400">Who's working on what, across every active project</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allProjects.map((p) => {
                const projectTasks = allTasks.filter((t) => t.projectId === p.id);
                const done = projectTasks.filter((t) => t.status === 'Completed').length;
                return (
                  <div key={p.id} className="bg-[#141418] border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                    <div>
                      <div className="text-sm font-bold text-white truncate">{p.name}</div>
                      <div className="text-[11px] text-gray-500">{p.client} · due {p.dueDate}</div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-gray-400">{done}/{projectTasks.length} tasks done</span>
                        <span className="font-bold text-white">{p.progress}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.members.map((m) => (
                        <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">{m}</span>
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
        ) : activeDept === 'hr' ? (
          /* HR Department View */
          <FounderHrView />
        ) : activeDept === 'it' ? (
          /* IT Service Desk View */
          <FounderItView />
        ) : (
          /* Department Switcher Views */
          <div className="bg-[#141418] border border-white/10 rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center min-h-[350px] relative overflow-hidden group">
            {/* Subtle background glow */}
            <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${currentDept.gradient} blur-3xl pointer-events-none`} />

            {/* Department Icon Badge */}
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${currentDept.gradient} flex items-center justify-center text-white mb-4 shadow-xl shadow-black/50 border border-white/20`}>
              <currentDept.icon size={32} />
            </div>

            {/* Department Title & Tag */}
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-black text-white tracking-tight">{currentDept.label}</h2>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${currentDept.tagColor}`}>
                Active
              </span>
            </div>

            {/* Welcome Message */}
            <p className="text-sm text-gray-300 max-w-xl leading-relaxed mb-6">
              {currentDept.welcomeMsg}
            </p>

            {/* Note Box */}
            <div className="p-4 rounded-2xl bg-[#18181c] border border-white/10 text-xs text-gray-400 max-w-lg flex items-center gap-3 text-left">
              <Sparkles size={18} className="text-[#e86024] shrink-0" />
              <div>
                <span className="font-semibold text-white">Custom Content Ready:</span> Aap bataiye is page par kaunse widgets, tables, ya controls add karne hain!
              </div>
            </div>
          </div>
        )}
      </main>

      <AppleDock onOpenChat={() => setIsChatOpen(true)} onSelectDept={(deptId) => setActiveDept(deptId)} activeDept={activeDept} />
      <TeamChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
