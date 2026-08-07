import React, { useState } from 'react';
import { toast } from 'sonner';
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
    gradient: 'from-muted to-muted',
  },
  {
    role: 'Senior Product Manager',
    candidate: 'Priya Nair',
    status: 'Offer Letter Sent',
    joiningDate: 'Aug 22, 2026',
    department: 'Product',
    gradient: 'from-muted to-muted',
  },
  {
    role: 'Sales Operations Lead',
    candidate: 'Vikram Malhotra',
    status: 'Interview Final Round',
    joiningDate: 'Pending Offer',
    department: 'Sales',
    gradient: 'from-warning to-primary',
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
    const item = complaints.find((c) => c.id === id);
    setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'Resolved' } : c)));
    toast.success(`Resolved ${id}`, { description: item ? `${item.name} · ${item.issue}` : undefined });
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Section Header */}
      <div className="bg-card border border-border rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-muted/10 flex items-center justify-center text-muted-foreground border border-muted/20 shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">HR Department Overview</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Executive summary of workforce headcount, attendance compliance, hiring, and escalated tickets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <span className="text-xs font-semibold uppercase px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            ● Live HR Metrics
          </span>
        </div>
      </div>

      {/* 1. 📊 QUICK METRIC CARDS (TOP HEADER - 4 NUMBERS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Headcount */}
        <div className="bg-card border border-border hover:border-muted-foreground/40 rounded-lg p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Headcount</span>
            <div className="w-7 h-7 rounded-lg bg-muted/10 border border-muted/20 text-muted-foreground flex items-center justify-center">
              <Users size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground">{employees.length}</span>
            <span className="text-xs font-semibold text-primary">{activeCount} active</span>
          </div>
        </div>

        {/* Card 2: Today's Attendance */}
        <div className="bg-card border border-border hover:border-muted-foreground/40 rounded-lg p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today's Attendance</span>
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <UserCheck size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-primary">{attendancePct}%</span>
            <span className="text-xs font-semibold text-muted-foreground">Present</span>
          </div>
        </div>

        {/* Card 3: Hiring Pipeline */}
        <div className="bg-card border border-border hover:border-muted-foreground/40 rounded-lg p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hiring Pipeline</span>
            <div className="w-7 h-7 rounded-lg bg-muted/10 border border-muted/20 text-muted-foreground flex items-center justify-center">
              <UserPlus size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-muted-foreground">{candidates.length}</span>
            <span className="text-xs font-semibold text-muted-foreground">Candidates in process</span>
          </div>
        </div>

        {/* Card 4: HR Complaints */}
        <div className="bg-card border border-border hover:border-muted-foreground/40 rounded-lg p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">HR Complaints</span>
            <div className="w-7 h-7 rounded-lg bg-warning/10 border border-warning/20 text-warning flex items-center justify-center">
              <ShieldAlert size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-warning">{pendingComplaintsCount}</span>
            <span className="text-xs font-semibold text-muted-foreground">Pending tickets</span>
          </div>
        </div>
      </div>

      {/* 2. 👥 DEPARTMENT HEADCOUNT BREAKDOWN */}
      <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3.5">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Department Headcount Breakdown</h3>
            <p className="text-xs text-muted-foreground">Employee strength across organization departments</p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground">
            {Object.keys(departmentCounts).length} Departments
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {Object.entries(departmentCounts).map(([dept, count]) => {
            const pct = Math.round((count / employees.length) * 100);
            return (
              <div key={dept} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-36 shrink-0 truncate font-semibold">{dept}</span>
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden p-0.5 border border-border">
                  <div
                    className="h-full bg-gradient-to-r from-muted via-muted to-muted rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-foreground w-12 text-right shrink-0">{count} emp</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 🎯 ACTIVE HIRING & UPCOMING JOINERS & 4. 🚨 HR ESCALATED COMPLAINTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 3. ACTIVE HIRING & UPCOMING JOINERS */}
        <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-muted/10 flex items-center justify-center text-muted-foreground border border-muted/20 shrink-0">
                <UserPlus size={15} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Active Hiring & Upcoming Joiners</h3>
                <p className="text-xs text-muted-foreground">Key open roles & candidates joining soon</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {UPCOMING_JOINERS.map((item) => (
              <div key={item.role} className="bg-muted border border-border rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-foreground truncate">{item.role}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Candidate: <strong>{item.candidate}</strong> ({item.department})</p>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar size={10} className="text-muted-foreground" />
                    Joining: <strong className="text-foreground">{item.joiningDate}</strong>
                  </span>
                </div>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted/10 border border-muted/30 text-muted-foreground shrink-0">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. 🚨 HR ESCALATED COMPLAINTS (ACTION NEEDED) */}
        <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center text-warning border border-warning/20 shrink-0">
                <ShieldAlert size={15} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  HR Escalated Complaints
                  {pendingComplaintsCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-warning/20 text-warning rounded-full border border-warning/30">
                      {pendingComplaintsCount} Pending
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">Employee complaints requiring high-priority action</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {complaints.map((item) => {
              const isResolved = item.status === 'Resolved';
              const priorityStyle =
                item.priority === 'High'
                  ? 'bg-destructive/20 text-destructive border-destructive/30'
                  : item.priority === 'Medium'
                  ? 'bg-warning/20 text-warning border-warning/30'
                  : 'bg-muted/20 text-muted-foreground border-muted/30';

              return (
                <div key={item.id} className="bg-muted border border-border rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-foreground truncate">{item.name}</h4>
                        <span className="text-xs font-bold text-muted-foreground">({item.department})</span>
                        <span className={`text-xs font-semibold px-1.5 py-0.2 rounded border ${priorityStyle}`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">{item.issue}</p>
                    </div>

                    <div className="shrink-0">
                      {isResolved ? (
                        <span className="px-2.5 py-1 bg-primary/10 border border-primary/30 text-primary text-xs font-semibold rounded-lg flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          Resolved
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleResolveComplaint(item.id)}
                          className="px-2.5 py-1 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1.5 border-t border-border">
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
