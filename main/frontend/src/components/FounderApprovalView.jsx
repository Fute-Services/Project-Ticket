import React, { useState } from 'react';
import { useApprovals } from '../context/ApprovalContext';
import { toast } from 'sonner';
import {
  Cpu,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
} from 'lucide-react';

export default function FounderApprovalView() {
  const { approvals, decide, hasMoreApprovals, loadMoreApprovals, loadingMore } = useApprovals();

  // Approving something is irreversible from this screen, so say plainly what
  // happened and who it affects rather than a bare "Success".
  function decideIt(item, status) {
    decide(item.id, status);
    const verb = status === 'approved' ? 'Approved' : 'Rejected';
    toast.success(`${verb}: ${item.title}`, {
      description: status === 'approved' ? 'IT can now see this decision.' : 'IT has been notified.',
    });
  }

  const [itFilter, setItFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [hrComplaintFilter, setHrComplaintFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [itSearchQuery, setItSearchQuery] = useState('');
  const [hrComplaintSearchQuery, setHrComplaintSearchQuery] = useState('');

  // Filter IT approvals - `source` scopes this to IT desk requests only;
  // HR's ticket-queue "Send for Approval" requests (source: 'HR') have
  // their own panel below instead of being lumped in here.
  const filteredItApprovals = approvals.filter((item) => {
    if (item.source !== 'IT') return false;
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

  // Filter HR ticket-queue approvals - created automatically when HR sets a
  // ticket's status to "Waiting Approval" (backend/controllers/hrController.js).
  const filteredHrComplaintApprovals = approvals.filter((item) => {
    if (item.source !== 'HR') return false;
    if (hrComplaintFilter === 'pending' && !(item.status === 'pending_founder' || item.status === 'pending')) return false;
    if (hrComplaintFilter === 'approved' && item.status !== 'approved') return false;
    if (hrComplaintFilter === 'rejected' && !(item.status === 'rejected' || item.status === 'not_approved')) return false;
    if (hrComplaintSearchQuery.trim()) {
      const q = hrComplaintSearchQuery.trim().toLowerCase();
      return (
        (item.id && String(item.id).toLowerCase().includes(q)) ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.sub && item.sub.toLowerCase().includes(q)) ||
        (item.requestedBy && item.requestedBy.toLowerCase().includes(q)) ||
        (item.priority && item.priority.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Count stats
  const itPendingCount = approvals.filter((a) => a.source === 'IT' && (a.status === 'pending_founder' || a.status === 'pending')).length;
  const hrComplaintPendingCount = approvals.filter((a) => a.source === 'HR' && (a.status === 'pending_founder' || a.status === 'pending')).length;

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
              Side-by-side management for IT Operations & HR Ticket Requests
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end flex-wrap">
          <div className="bg-muted/10 border border-muted/20 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-muted animate-pulse" />
            <span className="text-xs font-bold text-muted-foreground">IT Pending: {itPendingCount}</span>
          </div>
          <div className="bg-warning/10 border border-warning/20 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span className="text-xs font-bold text-warning">HR Tickets Pending: {hrComplaintPendingCount}</span>
          </div>
        </div>
      </div>

      {/* Panel Grid - 2 Columns */}
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
            <div className="flex items-center gap-1 bg-white/60 backdrop-blur-md p-1 rounded-xl border border-white/80 shadow-sm text-xs font-semibold">
              {['all', 'pending', 'approved', 'rejected'].map((f) => (
                <button
                  key={f}
                  onClick={() => setItFilter(f)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                    itFilter === f
                      ? 'bg-[#180D0F] text-white shadow-md border border-white/15 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-black/5'
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
              className="w-full bg-white/65 backdrop-blur-md border border-white/85 rounded-xl pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground hover:bg-white/80 focus-visible:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 shadow-sm transition-all"
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
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : 'bg-muted/20 text-muted-foreground border-muted/30';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                      isPending
                        ? 'bg-card border-border hover:border-primary/40 shadow-sm'
                        : isApproved
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-destructive/5 border-destructive/20'
                    }`}
                  >
                    {/* Item Top Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-primary">{item.id}</span>
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
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
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
                              className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
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

        {/* ================= MIDDLE COLUMN: HR TICKET APPROVALS ================= */}
        <div className="bg-background border border-border rounded-2xl p-4 flex flex-col gap-4">
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center text-warning border border-warning/20 shrink-0">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  HR Ticket Approvals
                  {hrComplaintPendingCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-warning/20 text-warning rounded-full border border-warning/30">
                      {hrComplaintPendingCount} pending
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">Requests HR sent from their Tickets Queue</p>
              </div>
            </div>

            {/* HR Ticket Filters */}
            <div className="flex items-center gap-1 bg-white/60 backdrop-blur-md p-1 rounded-xl border border-white/80 shadow-sm text-xs font-semibold">
              {['all', 'pending', 'approved', 'rejected'].map((f) => (
                <button
                  key={f}
                  onClick={() => setHrComplaintFilter(f)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                    hrComplaintFilter === f
                      ? 'bg-[#180D0F] text-white shadow-md border border-white/15 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-black/5'
                  }`}
                >
                  {f === 'rejected' ? 'Not Approved' : f}
                </button>
              ))}
            </div>
          </div>

          {/* HR Ticket Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={hrComplaintSearchQuery}
              onChange={(e) => setHrComplaintSearchQuery(e.target.value)}
              placeholder="Search HR ticket approvals by title, requester..."
              className="w-full bg-white/65 backdrop-blur-md border border-white/85 rounded-xl pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground hover:bg-white/80 focus-visible:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 shadow-sm transition-all"
            />
            {hrComplaintSearchQuery && (
              <button
                type="button"
                onClick={() => setHrComplaintSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* HR Ticket Items List */}
          <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredHrComplaintApprovals.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-xl border border-border flex flex-col items-center gap-2">
                <CheckCircle2 size={24} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No HR ticket requests found in this filter.</p>
              </div>
            ) : (
              filteredHrComplaintApprovals.map((item) => {
                const isApproved = item.status === 'approved';
                const isRejected = item.status === 'rejected' || item.status === 'not_approved';
                const isPending = !isApproved && !isRejected;

                const priorityStyle =
                  item.priority === 'High'
                    ? 'bg-destructive/20 text-destructive border-destructive/30'
                    : item.priority === 'Medium'
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : 'bg-muted/20 text-muted-foreground border-muted/30';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                      isPending
                        ? 'bg-card border-border hover:border-warning/40 shadow-sm'
                        : isApproved
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-destructive/5 border-destructive/20'
                    }`}
                  >
                    {/* Item Top Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-warning">{item.id}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border uppercase ${priorityStyle}`}>
                            {item.priority || 'Normal'}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-foreground leading-snug">{item.title}</h4>
                        {item.sub && <p className="text-xs text-muted-foreground line-clamp-2">{item.sub}</p>}
                      </div>

                      {/* Status / Action Buttons */}
                      <div className="shrink-0">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
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
                              className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
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

      </div>

      {hasMoreApprovals && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMoreApprovals}
            disabled={loadingMore}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
