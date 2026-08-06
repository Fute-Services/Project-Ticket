import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Server,
  Building2,
  Bell,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { employees, candidates, interviews } from '../data/hrMockData';

import TeamChatDrawer from '../components/TeamChatDrawer';

export default function FounderDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200 overflow-x-hidden">
      {/* Top Navigation Header Bar */}
      <header className="h-14 border-b border-white/[0.08] px-4 lg:px-8 flex items-center justify-between shrink-0 bg-[#0d0d11]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff5b00] to-[#ff8c00] flex items-center justify-center text-white font-black text-sm shadow-[0_0_15px_rgba(255,91,0,0.4)]">
              F
            </div>
            <div>
              <div className="font-extrabold text-sm text-white tracking-tight leading-none">FOUNDER PANEL</div>
              <div className="text-[10px] text-gray-400 leading-none mt-0.5">HR & IT Management System</div>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifs((p) => !p)}
              className="relative w-9 h-9 rounded-xl bg-[#16161a] border border-white/10 hover:border-white/20 text-gray-300 transition-colors flex items-center justify-center cursor-pointer"
            >
              <Bell size={15} />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#e86024] text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-[#09090b]">
                3
              </span>
            </button>
            {showNotifs && (
              <div className="absolute top-full right-0 mt-2 w-[300px] bg-[#18181c] border border-white/10 rounded-2xl shadow-xl overflow-hidden z-50 p-3">
                <div className="text-xs font-bold text-white mb-2 pb-2 border-b border-white/5">Notifications</div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded-lg bg-white/5 text-gray-200">Server 70 High CPU Usage (10 min ago)</div>
                  <div className="p-2 rounded-lg bg-white/5 text-gray-200">5 Leave requests pending (1 hr ago)</div>
                  <div className="p-2 rounded-lg bg-white/5 text-gray-200">Interview feedback pending (2 hr ago)</div>
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

          {/* Calendar Pill */}
          <div className="h-9 hidden sm:flex items-center gap-2 px-3 rounded-xl bg-[#16161a] border border-white/10 text-xs text-gray-300 font-medium">
            <Calendar size={13} className="text-[#e86024]" />
            <span>{currentDateStr}</span>
          </div>

          {/* Founder Profile Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((p) => !p)}
              className="h-9 flex items-center gap-2 px-2.5 rounded-xl bg-[#16161a] border border-white/10 hover:border-white/20 cursor-pointer transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-[#e86024]/20 border border-[#e86024]/40 flex items-center justify-center font-bold text-[10px] text-[#e86024]">
                F
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[11px] font-semibold text-white leading-none">{user?.full_name || 'Founder'}</span>
                <span className="text-[9px] text-gray-400">Super Admin</span>
              </div>
              <ChevronDown size={11} className="text-gray-400" />
            </button>
            {showProfileMenu && (
              <div className="absolute top-full right-0 mt-2 w-[160px] bg-[#18181c] border border-white/10 rounded-xl p-1.5 shadow-xl z-50">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/', { replace: true });
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 p-4 lg:p-6 max-w-[1700px] w-full mx-auto flex flex-col gap-5">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none mb-1">
              Hello Founder! 👋
            </h1>
            <p className="text-xs text-gray-400">Here's what's happening across HR and IT in your organization today.</p>
          </div>
        </div>

        {/* 1. Top Key Stat Metrics Row (6 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#141418] border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between min-h-[75px]">
            <div className="text-[11px] font-semibold text-gray-400 truncate">Total Employees</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">346</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Total in company</span>
            </div>
          </div>
          <div className="bg-[#141418] border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between min-h-[75px]">
            <div className="text-[11px] font-semibold text-gray-400 truncate">Candidates</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">128</span>
              <span className="text-[10px] text-purple-400 font-semibold">In pipeline</span>
            </div>
          </div>
          <div className="bg-[#141418] border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between min-h-[75px]">
            <div className="text-[11px] font-semibold text-gray-400 truncate">Open IT Tickets</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">23</span>
              <span className="text-[10px] text-orange-400 font-semibold">Needs attention</span>
            </div>
          </div>
          <div className="bg-[#141418] border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between min-h-[75px]">
            <div className="text-[11px] font-semibold text-gray-400 truncate">Pending Approvals</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">12</span>
              <span className="text-[10px] text-amber-400 font-semibold">Waiting for action</span>
            </div>
          </div>
          <div className="bg-[#141418] border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between min-h-[75px]">
            <div className="text-[11px] font-semibold text-gray-400 truncate">Attendance Today</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">87%</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Good</span>
            </div>
          </div>
          <div className="bg-[#141418] border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between min-h-[75px]">
            <div className="text-[11px] font-semibold text-gray-400 truncate">IT Engineers Online</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">15</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Active now</span>
            </div>
          </div>
        </div>

        {/* 2. Department Breakdown & Schedule Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* HR Overview Card */}
          <div className="bg-[#141418] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-[#e86024]" />
                  <h3 className="font-extrabold text-sm text-white">HR Overview</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-semibold border border-orange-500/20">
                  Live
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                  <div className="text-base font-black text-white">7</div>
                  <div className="text-[10px] text-gray-400 truncate">Interviews Today</div>
                  <div className="text-[9px] text-orange-400">3 upcoming</div>
                </div>
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                  <div className="text-base font-black text-white">5</div>
                  <div className="text-[10px] text-gray-400 truncate">Pending Feedback</div>
                  <div className="text-[9px] text-amber-400">To be reviewed</div>
                </div>
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                  <div className="text-base font-black text-white">8</div>
                  <div className="text-[10px] text-gray-400 truncate">Leave Requests</div>
                  <div className="text-[9px] text-yellow-400">5 pending</div>
                </div>
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                  <div className="text-base font-black text-white">16</div>
                  <div className="text-[10px] text-gray-400 truncate">New Candidates</div>
                  <div className="text-[9px] text-emerald-400">This week</div>
                </div>
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                  <div className="text-base font-black text-white">6</div>
                  <div className="text-[10px] text-gray-400 truncate">Meetings</div>
                  <div className="text-[9px] text-blue-400">Today</div>
                </div>
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                  <div className="text-base font-black text-white">42</div>
                  <div className="text-[10px] text-gray-400 truncate">Resumes Sourced</div>
                  <div className="text-[9px] text-purple-400">This week</div>
                </div>
              </div>
            </div>
          </div>

          {/* IT Overview Card */}
          <div className="bg-[#141418] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Server size={16} className="text-[#e86024]" />
                  <h3 className="font-extrabold text-sm text-white">IT Overview</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                  Systems Active
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                  <div className="text-base font-black text-white">5</div>
                  <div className="text-[10px] text-gray-400 truncate">Critical Tickets</div>
                  <div className="text-[9px] text-red-400">High Priority</div>
                </div>
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                  <div className="text-base font-black text-white">7</div>
                  <div className="text-[10px] text-gray-400 truncate">Pending Approvals</div>
                  <div className="text-[9px] text-yellow-400">Waiting</div>
                </div>
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                  <div className="text-base font-black text-white">4</div>
                  <div className="text-[10px] text-gray-400 truncate">VPN Requests</div>
                  <div className="text-[9px] text-blue-400">New requests</div>
                </div>
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                  <div className="text-base font-black text-white">3</div>
                  <div className="text-[10px] text-gray-400 truncate">Network Issues</div>
                  <div className="text-[9px] text-amber-400">Active</div>
                </div>
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                  <div className="text-base font-black text-white">6</div>
                  <div className="text-[10px] text-gray-400 truncate">Data Requests</div>
                  <div className="text-[9px] text-purple-400">In progress</div>
                </div>
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                  <div className="text-base font-black text-white">12/14</div>
                  <div className="text-[10px] text-gray-400 truncate">Servers Status</div>
                  <div className="text-[9px] text-emerald-400">Operational</div>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Schedule Card */}
          <div className="bg-[#141418] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-[#e86024]" />
                  <h3 className="font-extrabold text-sm text-white">Today's Schedule</h3>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">4 Events</span>
              </div>
              <div className="flex flex-col gap-2.5 mb-4">
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-white truncate">HR Team Meeting</div>
                    <div className="text-[10px] text-gray-400">Conference Room</div>
                  </div>
                  <span className="text-[10px] font-bold text-[#e86024] shrink-0">10:00 AM</span>
                </div>
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-white truncate">Interview - Rohan Mehta</div>
                    <div className="text-[10px] text-gray-400">Meeting Room 1</div>
                  </div>
                  <span className="text-[10px] font-bold text-purple-400 shrink-0">12:00 PM</span>
                </div>
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-white truncate">IT Review Meeting</div>
                    <div className="text-[10px] text-gray-400">IT Conference Room</div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-400 shrink-0">02:30 PM</span>
                </div>
                <div className="p-2 rounded-xl bg-[#18181c] border border-white/5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-white truncate">Performance Review</div>
                    <div className="text-[10px] text-gray-400">HR Office</div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 shrink-0">04:00 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Analytics & Funnel Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Attendance Overview Bar Chart */}
          <div className="bg-[#141418] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="text-xs font-bold text-white mb-3">Attendance (This Week)</div>
            <div className="flex items-end justify-between gap-1.5 h-32 pt-4">
              {[
                { day: 'Mon', pct: 88 },
                { day: 'Tue', pct: 92 },
                { day: 'Wed', pct: 89 },
                { day: 'Thu', pct: 85 },
                { day: 'Fri', pct: 90 },
                { day: 'Sat', pct: 40 },
                { day: 'Sun', pct: 20 },
              ].map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-400">{d.pct}%</span>
                  <div
                    className="w-full rounded-t-md bg-[#e86024] opacity-90 hover:opacity-100 transition-opacity"
                    style={{ height: `${(d.pct / 100) * 80}px` }}
                  />
                  <span className="text-[9px] text-gray-500 font-bold">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recruitment Funnel */}
          <div className="bg-[#141418] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="text-xs font-bold text-white mb-3">Recruitment Funnel</div>
            <div className="flex flex-col gap-1.5">
              {[
                { stage: 'Applied', count: 354, color: '#3b82f6' },
                { stage: 'Screening', count: 152, color: '#a855f7' },
                { stage: 'Interview', count: 64, color: '#eab308' },
                { stage: 'Offered', count: 28, color: '#f97316' },
                { stage: 'Joined', count: 16, color: '#10b981' },
              ].map((f) => (
                <div key={f.stage} className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-gray-400 font-medium">{f.stage}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(f.count / 354) * 100}%`, backgroundColor: f.color }} />
                    </div>
                    <span className="text-[11px] font-bold text-white w-6 text-right">{f.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* IT Tickets Donut */}
          <div className="bg-[#141418] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="text-xs font-bold text-white mb-2">IT Tickets by Status</div>
            <div className="flex items-center justify-around gap-2 my-auto">
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.05)" strokeWidth="14" fill="transparent" />
                  <circle cx="50" cy="50" r="38" stroke="#f97316" strokeWidth="14" strokeDasharray="70 238" fill="transparent" />
                  <circle cx="50" cy="50" r="38" stroke="#3b82f6" strokeWidth="14" strokeDasharray="50 238" strokeDashoffset="-70" fill="transparent" />
                  <circle cx="50" cy="50" r="38" stroke="#10b981" strokeWidth="14" strokeDasharray="80 238" strokeDashoffset="-120" fill="transparent" />
                </svg>
                <span className="absolute text-xs font-black text-white">248</span>
              </div>
              <div className="flex flex-col gap-1 text-[10px]">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f97316]" /><span className="text-gray-300">Open (28%)</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#3b82f6]" /><span className="text-gray-300">In Progress (22%)</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10b981]" /><span className="text-gray-300">Resolved (30%)</span></div>
              </div>
            </div>
          </div>

          {/* System Alerts */}
          <div className="bg-[#141418] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white">System Alerts</span>
              <span className="text-[10px] text-red-400 font-bold">2 High Priority</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs flex items-center justify-between">
                <span className="text-red-300 text-[11px]">Server 70 - High CPU</span>
                <span className="text-[9px] text-red-400">10m ago</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
                <span className="text-amber-300 text-[11px]">Backup Server - Low Disk</span>
                <span className="text-[9px] text-amber-400">30m ago</span>
              </div>
              <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs flex items-center justify-between">
                <span className="text-yellow-300 text-[11px]">5 Pending Leave Requests</span>
                <span className="text-[9px] text-yellow-400">1h ago</span>
              </div>
            </div>
          </div>
        </div>

      </main>

      <TeamChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
