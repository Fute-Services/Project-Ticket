import React, { useState } from 'react';
import { useApprovals } from '../context/ApprovalContext';
import { useLeave } from '../context/LeaveContext';
import { toast } from 'sonner';
import {
  Cpu,
  Plane,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  User,
  Calendar,
  FileText,
  Tag,
  Search,
} from 'lucide-react';

export default function FounderApprovalView() {
  const { approvals, decide } = useApprovals();
  const { leaveRequests, decide: decideLeave } = useLeave();

  // Approving something is irreversible from this screen, so say plainly what
  // happened and who it affects rather than a bare "Success".
  function decideIt(item, status) {
    decide(item.id, status);
    const verb = status === 'approved' ? 'Approved' : 'Rejected';
    toast.success(`${verb}: ${item.title}`, {
      description: status === 'approved' ? 'IT can now see this decision.' : 'IT has been notified.',
    });
  }

  function decideLeaveReq(item, status) {
    decideLeave(item.id, status);
    toast.success(`${status}: ${item.employee}'s leave`, {
      description: `${item.type} · ${item.from} → ${item.to}`,
    });
  }

  const [itFilter, setItFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [hrFilter, setHrFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [itSearchQuery, setItSearchQuery] = useState('');
  const [hrSearchQuery, setHrSearchQuery] = useState('');

  // Filter IT approvals
  const filteredItApprovals = approvals.filter((item) => {
    if (itFilter === 'pending' && !(item.status === 'pending_founder' || item.status === 'pending')) return false;
    if (itFilter === 'approved' && item.status !== 'approved') return false;
    if (itFilter === 'rejected' && !(item.status === 'rejected' || item.status === 'not_approved')) return false;
    if (itSearchQuery.trim()) {
      const q = itSearchQuery.trim().toLowerCase();
      return (
        (item.id && String(item.id).toLowerCase().includes(q)) ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.sub && item.sub.toLowerCase().includes(q)) ||
        (item.requestedBy && item.requestedBy.toLowerCase().includes(q)) ||
        (item.department && item.department.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.priority && item.priority.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filter HR leave requests
  const filteredHrLeaves = leaveRequests.filter((item) => {
    if (hrFilter === 'pending' && item.status !== 'Pending') return false;
    if (hrFilter === 'approved' && item.status !== 'Approved') return false;
    if (hrFilter === 'rejected' && !(item.status === 'Rejected' || item.status === 'Not Approved')) return false;
    if (hrSearchQuery.trim()) {
      const q = hrSearchQuery.trim().toLowerCase();
      return (
        (item.id && String(item.id).toLowerCase().includes(q)) ||
        (item.employee && item.employee.toLowerCase().includes(q)) ||
        (item.type && item.type.toLowerCase().includes(q)) ||
        (item.reason && item.reason.toLowerCase().includes(q)) ||
        (item.department && item.department.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Count stats
  const itPendingCount = approvals.filter((a) => a.status === 'pending_founder' || a.status === 'pending').length;
  const hrPendingCount = leaveRequests.filter((l) => l.status === 'Pending').length;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Header Banner */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-muted/10 flex items-center justify-center text-muted-foreground border border-muted/20 shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Executive Approval Center</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Side-by-side management for IT Operations & HR Employee Leave Applications
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
          <div className="bg-muted/10 border border-muted/20 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-muted animate-pulse" />
            <span className="text-xs font-bold text-muted-foreground">IT Pending: {itPendingCount}</span>
          </div>
          <div className="bg-warning/10 border border-warning/20 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span className="text-xs font-bold text-warning">HR Pending: {hrPendingCount}</span>
          </div>
        </div>
      </div>

      {/* Dual Panel Grid - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ================= LEFT COLUMN: IT TEAM APPROVALS ================= */}
        <div className="bg-background border border-border rounded-2xl p-4 flex flex-col gap-4">
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-muted/10 flex items-center justify-center text-muted-foreground border border-muted/20 shrink-0">
                <Cpu size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  IT Team Approvals
                  {itPendingCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-muted/20 text-muted-foreground rounded-full border border-muted/30">
                      {itPendingCount} pending
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">Software, Hardware & System Access Requests</p>
              </div>
            </div>

            {/* IT Filters */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border text-xs font-semibold">
              {['all', 'pending', 'approved', 'rejected'].map((f) => (
                <button
                  key={f}
                  onClick={() => setItFilter(f)}
                  className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                    itFilter === f
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-bold'
                      : 'text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10'
                  }`}
                >
                  {f === 'rejected' ? 'Not Approved' : f}
                </button>
              ))}
            </div>
          </div>

          {/* IT Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={itSearchQuery}
              onChange={(e) => setItSearchQuery(e.target.value)}
              placeholder="Search IT approvals by title, requester, department..."
              className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {itSearchQuery && (
              <button
                type="button"
                onClick={() => setItSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* IT Items List */}
          <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredItApprovals.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-xl border border-border flex flex-col items-center gap-2">
                <CheckCircle2 size={24} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No IT requests found in this filter.</p>
              </div>
            ) : (
              filteredItApprovals.map((item) => {
                const isApproved = item.status === 'approved';
                const isRejected = item.status === 'rejected' || item.status === 'not_approved';
                const isPending = !isApproved && !isRejected;

                const priorityStyle =
                  item.priority === 'high'
                    ? 'bg-destructive/20 text-destructive border-destructive/30'
                    : item.priority === 'medium'
                    ? 'bg-warning/20 text-warning border-warning/30'
                    : 'bg-muted/20 text-muted-foreground border-muted/30';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                      isPending
                        ? 'bg-card border-border hover:border-orange-500/40 shadow-sm'
                        : isApproved
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-destructive/5 border-destructive/20'
                    }`}
                  >
                    {/* Item Top Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-orange-500">{item.id}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border uppercase ${priorityStyle}`}>
                            {item.priority || 'Normal'}
                          </span>
                          <span className="text-xs text-muted-foreground border-l border-border pl-2">
                            {item.category || 'General'}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-foreground leading-snug">{item.title}</h4>
                        {item.sub && <p className="text-xs text-muted-foreground line-clamp-2">{item.sub}</p>}
                      </div>

                      {/* Status / Action Buttons */}
                      <div className="shrink-0">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 size={13} /> Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                            <XCircle size={13} /> Not Approved
                          </span>
                        )}
                        {isPending && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => decideIt(item, 'approved')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => decideIt(item, 'rejected')}
                              className="bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold text-xs px-2.5 py-1.5 rounded-lg border border-destructive/20 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <X size={13} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: HR TEAM LEAVE APPROVALS ================= */}
        <div className="bg-background border border-border rounded-2xl p-4 flex flex-col gap-4">
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center text-warning border border-warning/20 shrink-0">
                <Plane size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  HR Team Leave Approvals
                  {hrPendingCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-warning/20 text-warning rounded-full border border-warning/30">
                      {hrPendingCount} pending
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">Employee Leave Applications & Time Off Requests</p>
              </div>
            </div>

            {/* HR Filters */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border text-xs font-semibold">
              {['all', 'pending', 'approved', 'rejected'].map((f) => (
                <button
                  key={f}
                  onClick={() => setHrFilter(f)}
                  className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                    hrFilter === f
                      ? 'bg-warning text-warning-foreground font-bold'
                      : 'text-muted-foreground hover:text-warning hover:bg-warning/10'
                  }`}
                >
                  {f === 'rejected' ? 'Not Approved' : f}
                </button>
              ))}
            </div>
          </div>

          {/* HR Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={hrSearchQuery}
              onChange={(e) => setHrSearchQuery(e.target.value)}
              placeholder="Search leave requests by employee, type, reason..."
              className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {hrSearchQuery && (
              <button
                type="button"
                onClick={() => setHrSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* HR Leave Items List */}
          <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredHrLeaves.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-xl border border-border flex flex-col items-center gap-2">
                <CheckCircle2 size={24} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No leave applications found in this filter.</p>
              </div>
            ) : (
              filteredHrLeaves.map((item) => {
                const isApproved = item.status === 'Approved';
                const isRejected = item.status === 'Rejected' || item.status === 'Not Approved';
                const isPending = !isApproved && !isRejected;

                return (
                  <div
                    key={item.id}
                    className="bg-card border border-border hover:border-muted-foreground/40 rounded-2xl p-3.5 flex flex-col gap-2.5 transition-all relative group"
                  >
                    {/* Top Row: Employee Name & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-foreground truncate">{item.employee}</h4>
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-warning/10 border border-warning/20 text-warning">
                            {item.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-warning" />
                            <strong>{item.from}</strong> → <strong>{item.to}</strong>
                          </span>
                          <span className="text-xs px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border">
                            {item.days} {item.days > 1 ? 'days' : 'day'}
                          </span>
                        </div>
                      </div>

                      {/* Status Tag or Actions */}
                      <div className="shrink-0">
                        {isApproved && (
                          <div className="px-3 py-1 bg-primary/10 border border-primary/30 text-primary text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm">
                            <Check size={14} className="stroke-[3]" />
                            <span>Approved</span>
                          </div>
                        )}

                        {isRejected && (
                          <div className="px-3 py-1 bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm">
                            <X size={14} className="stroke-[3]" />
                            <span>Not Approved</span>
                          </div>
                        )}

                        {isPending && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => decideLeaveReq(item, 'Approved')}
                              className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-md"
                              title="Approve Leave"
                            >
                              <Check size={16} className="stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => decideLeaveReq(item, 'Rejected')}
                              className="w-8 h-8 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive hover:bg-destructive/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-md"
                              title="Reject Leave"
                            >
                              <X size={16} className="stroke-[2.5]" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Reason & Metadata Row */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5 truncate">
                        <FileText size={12} className="text-muted-foreground shrink-0" />
                        <span className="truncate">Reason: <em className="text-foreground font-normal">"{item.reason || 'No reason specified'}"</em></span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{item.id}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
