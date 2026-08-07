import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  Briefcase,
  AlertTriangle,
  UserPlus,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { employees, candidates, attendanceRecords } from '../data/hrMockData';

// Seed HR Complaints for Founder View
const INITIAL_HR_COMPLAINTS = [
  {
    id: 'FT-HR-9012',
    name: 'Sneha Iyer',
    department: 'Engineering',
    issue: 'Overtime Allowance Discrepancy for July sprint deployment',
    priority: 'High',
    submittedAt: '2 days ago',
    status: 'Pending',
  },
  {
    id: 'FT-HR-8841',
    name: 'Rohan Sharma',
    department: 'Sales',
    issue: 'Quarterly Incentive Commission Calculation Review',
    priority: 'Medium',
    submittedAt: '3 days ago',
    status: 'Pending',
  },
  {
    id: 'FT-HR-7620',
    name: 'Ananya Rao',
    department: 'Marketing',
    issue: 'Remote Working Equipment Allowance Request',
    priority: 'Low',
    submittedAt: '5 days ago',
    status: 'Resolved',
  },
];

// Active Urgent Openings & Upcoming Joiners
const UPCOMING_JOINERS = [
  {
    role: 'Lead Backend Developer',
    candidate: 'Arjun Mehta',
    status: 'Offer Accepted',
    joiningDate: 'Aug 18, 2026',
    department: 'Engineering',
    gradient: 'from-blue-500 to-indigo-500',
  },
  {
    role: 'Senior Product Manager',
    candidate: 'Priya Nair',
    status: 'Offer Letter Sent',
    joiningDate: 'Aug 22, 2026',
    department: 'Product',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    role: 'Sales Operations Lead',
    candidate: 'Vikram Malhotra',
    status: 'Interview Final Round',
    joiningDate: 'Pending Offer',
    department: 'Sales',
    gradient: 'from-amber-500 to-orange-500',
  },
];

export default function FounderHrView() {
  const [complaints, setComplaints] = useState(INITIAL_HR_COMPLAINTS);

  // Compute Metrics
  const activeCount = employees.filter((e) => e.status === 'Active').length;
  const todaysAttendance = attendanceRecords.filter((a) => a.date === '2026-08-06');
  const presentToday = todaysAttendance.filter((a) => a.status === 'Present' || a.status === 'Work From Home').length;
  const attendancePct = todaysAttendance.length ? Math.round((presentToday / todaysAttendance.length) * 100) : 92;

  const pendingComplaintsCount = complaints.filter((c) => c.status === 'Pending').length;

  const departmentCounts = employees.reduce((acc, e) => {
    acc[e.department] = (acc[e.department] || 0) + 1;
    return acc;
  }, {});

  const handleResolveComplaint = (id) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'Resolved' } : c))
    );
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Section Header */}
      <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl border border-white/20">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">HR Department Overview</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Executive summary of workforce headcount, attendance compliance, hiring, and escalated tickets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10 self-stretch sm:self-auto justify-end">
          <span className="text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            ● Live HR Metrics
          </span>
        </div>
      </div>

      {/* 1. 📊 QUICK METRIC CARDS (TOP HEADER - 4 NUMBERS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Headcount */}
        <div className="bg-[#141418] border border-white/10 hover:border-white/20 rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Total Headcount</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{employees.length}</span>
            <span className="text-xs font-semibold text-emerald-400">{activeCount} active</span>
          </div>
        </div>

        {/* Card 2: Today's Attendance */}
        <div className="bg-[#141418] border border-white/10 hover:border-white/20 rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Today's Attendance</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <UserCheck size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{attendancePct}%</span>
            <span className="text-xs font-semibold text-gray-400">Present</span>
          </div>
        </div>

        {/* Card 3: Hiring Pipeline */}
        <div className="bg-[#141418] border border-white/10 hover:border-white/20 rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Hiring Pipeline</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <UserPlus size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-400">{candidates.length}</span>
            <span className="text-xs font-semibold text-gray-400">Candidates in process</span>
          </div>
        </div>

        {/* Card 4: HR Complaints */}
        <div className="bg-[#141418] border border-white/10 hover:border-white/20 rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">HR Complaints</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldAlert size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">{pendingComplaintsCount}</span>
            <span className="text-xs font-semibold text-gray-400">Pending tickets</span>
          </div>
        </div>
      </div>

      {/* 2. 👥 DEPARTMENT HEADCOUNT BREAKDOWN */}
      <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 flex flex-col gap-3.5">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div>
            <h3 className="text-sm font-black text-white">Department Headcount Breakdown</h3>
            <p className="text-[11px] text-gray-400">Employee strength across organization departments</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300">
            {Object.keys(departmentCounts).length} Departments
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {Object.entries(departmentCounts).map(([dept, count]) => {
            const pct = Math.round((count / employees.length) * 100);
            return (
              <div key={dept} className="flex items-center gap-3">
                <span className="text-xs text-gray-300 w-36 shrink-0 truncate font-semibold">{dept}</span>
                <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-black text-white w-12 text-right shrink-0">{count} emp</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 🎯 ACTIVE HIRING & UPCOMING JOINERS & 4. 🚨 HR ESCALATED COMPLAINTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 3. ACTIVE HIRING & UPCOMING JOINERS */}
        <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md">
                <UserPlus size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Active Hiring & Upcoming Joiners</h3>
                <p className="text-[11px] text-gray-400">Key open roles & candidates joining soon</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {UPCOMING_JOINERS.map((item) => (
              <div key={item.role} className="bg-[#1a1a20] border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-white truncate">{item.role}</h4>
                  <p className="text-[11px] text-gray-300 mt-0.5">Candidate: <strong>{item.candidate}</strong> ({item.department})</p>
                  <span className="text-[9px] text-gray-400 flex items-center gap-1 mt-1">
                    <Calendar size={10} className="text-purple-400" />
                    Joining: <strong className="text-gray-200">{item.joiningDate}</strong>
                  </span>
                </div>

                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 shrink-0">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. 🚨 HR ESCALATED COMPLAINTS (ACTION NEEDED) */}
        <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md">
                <ShieldAlert size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  HR Escalated Complaints
                  {pendingComplaintsCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                      {pendingComplaintsCount} Pending
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-gray-400">Employee complaints requiring high-priority action</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {complaints.map((item) => {
              const isResolved = item.status === 'Resolved';
              const priorityStyle =
                item.priority === 'High'
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : item.priority === 'Medium'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-400 border-blue-500/30';

              return (
                <div key={item.id} className="bg-[#1a1a20] border border-white/10 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-white truncate">{item.name}</h4>
                        <span className="text-[9px] font-bold text-gray-400">({item.department})</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${priorityStyle}`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 mt-1 leading-snug">{item.issue}</p>
                    </div>

                    <div className="shrink-0">
                      {isResolved ? (
                        <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold rounded-lg flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          Resolved
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleResolveComplaint(item.id)}
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-black rounded-lg transition-all cursor-pointer shadow-sm"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-gray-500 pt-1.5 border-t border-white/5">
                    <span>Ticket ID: <strong>{item.id}</strong></span>
                    <span>{item.submittedAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
