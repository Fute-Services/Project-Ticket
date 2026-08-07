import React, { useState } from 'react';
import { useApprovals } from '../context/ApprovalContext';
import { useLeave } from '../context/LeaveContext';
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
} from 'lucide-react';

export default function FounderApprovalView() {
  const { approvals, decide } = useApprovals();
  const { leaveRequests, decide: decideLeave } = useLeave();

  const [itFilter, setItFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [hrFilter, setHrFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'

  // Filter IT approvals
  const filteredItApprovals = approvals.filter((item) => {
    if (itFilter === 'pending') return item.status === 'pending_founder' || item.status === 'pending';
    if (itFilter === 'approved') return item.status === 'approved';
    if (itFilter === 'rejected') return item.status === 'rejected' || item.status === 'not_approved';
    return true;
  });

  // Filter HR leave requests
  const filteredHrLeaves = leaveRequests.filter((item) => {
    if (hrFilter === 'pending') return item.status === 'Pending';
    if (hrFilter === 'approved') return item.status === 'Approved';
    if (hrFilter === 'rejected') return item.status === 'Rejected' || item.status === 'Not Approved';
    return true;
  });

  // Count stats
  const itPendingCount = approvals.filter((a) => a.status === 'pending_founder' || a.status === 'pending').length;
  const hrPendingCount = leaveRequests.filter((l) => l.status === 'Pending').length;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Header Banner */}
      <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-xl border border-white/20">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Executive Approval Center</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Side-by-side management for IT Operations & HR Employee Leave Applications
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 self-stretch sm:self-auto justify-end">
          <div className="bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-bold text-cyan-300">IT Pending: {itPendingCount}</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-300">HR Pending: {hrPendingCount}</span>
          </div>
        </div>
      </div>

      {/* Dual Panel Grid - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ================= LEFT COLUMN: IT TEAM APPROVALS ================= */}
        <div className="bg-[#101014] border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-teal-500 flex items-center justify-center text-white shadow-md border border-white/10">
                <Cpu size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  IT Team Approvals
                  {itPendingCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                      {itPendingCount} pending
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-gray-400">Software, Hardware & System Access Requests</p>
              </div>
            </div>

            {/* IT Filters */}
            <div className="flex items-center gap-1 bg-[#18181c] p-1 rounded-lg border border-white/5 text-[10px] font-semibold">
              {['all', 'pending', 'approved', 'rejected'].map((f) => (
                <button
                  key={f}
                  onClick={() => setItFilter(f)}
                  className={`px-2.5 py-1 rounded-md capitalize transition-all cursor-pointer ${
                    itFilter === f
                      ? 'bg-cyan-500 text-white shadow-sm font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f === 'rejected' ? 'Not Approved' : f}
                </button>
              ))}
            </div>
          </div>

          {/* IT Items List */}
          <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredItApprovals.length === 0 ? (
              <div className="p-8 text-center bg-[#141418] rounded-xl border border-white/5 flex flex-col items-center gap-2">
                <CheckCircle2 size={24} className="text-gray-600" />
                <p className="text-xs text-gray-400">No IT requests found in this filter.</p>
              </div>
            ) : (
              filteredItApprovals.map((item) => {
                const isApproved = item.status === 'approved';
                const isRejected = item.status === 'rejected' || item.status === 'not_approved';
                const isPending = !isApproved && !isRejected;

                const priorityStyle =
                  item.priority === 'high'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : item.priority === 'medium'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30';

                return (
                  <div
                    key={item.id}
                    className="bg-[#141418] border border-white/10 hover:border-white/20 rounded-xl p-3.5 flex flex-col gap-2.5 transition-all relative group"
                  >
                    {/* Top Row: Title & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-white truncate">{item.title}</h4>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${priorityStyle}`}>
                            {item.priority || 'NORMAL'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-300 mt-1 leading-snug">{item.sub}</p>
                      </div>

                      {/* Status Tag or Actions */}
                      <div className="shrink-0">
                        {isApproved && (
                          <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow-sm">
                            <Check size={14} className="stroke-[3]" />
                            <span>Approved</span>
                          </div>
                        )}

                        {isRejected && (
                          <div className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow-sm">
                            <X size={14} className="stroke-[3]" />
                            <span>Not Approved</span>
                          </div>
                        )}

                        {isPending && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => decide(item.id, 'approved')}
                              className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-md"
                              title="Approve IT Request"
                            >
                              <Check size={16} className="stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => decide(item.id, 'rejected')}
                              className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-md"
                              title="Reject IT Request"
                            >
                              <X size={16} className="stroke-[2.5]" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Metadata Row */}
                    <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-gray-500" />
                        <span>Requested by <strong className="text-gray-200">{item.requestedBy}</strong></span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock size={11} />
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: HR TEAM LEAVE APPROVALS ================= */}
        <div className="bg-[#101014] border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md border border-white/10">
                <Plane size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  HR Team Leave Approvals
                  {hrPendingCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                      {hrPendingCount} pending
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-gray-400">Employee Leave Applications & Time Off Requests</p>
              </div>
            </div>

            {/* HR Filters */}
            <div className="flex items-center gap-1 bg-[#18181c] p-1 rounded-lg border border-white/5 text-[10px] font-semibold">
              {['all', 'pending', 'approved', 'rejected'].map((f) => (
                <button
                  key={f}
                  onClick={() => setHrFilter(f)}
                  className={`px-2.5 py-1 rounded-md capitalize transition-all cursor-pointer ${
                    hrFilter === f
                      ? 'bg-amber-500 text-white shadow-sm font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f === 'rejected' ? 'Not Approved' : f}
                </button>
              ))}
            </div>
          </div>

          {/* HR Leave Items List */}
          <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredHrLeaves.length === 0 ? (
              <div className="p-8 text-center bg-[#141418] rounded-xl border border-white/5 flex flex-col items-center gap-2">
                <CheckCircle2 size={24} className="text-gray-600" />
                <p className="text-xs text-gray-400">No leave applications found in this filter.</p>
              </div>
            ) : (
              filteredHrLeaves.map((item) => {
                const isApproved = item.status === 'Approved';
                const isRejected = item.status === 'Rejected' || item.status === 'Not Approved';
                const isPending = !isApproved && !isRejected;

                return (
                  <div
                    key={item.id}
                    className="bg-[#141418] border border-white/10 hover:border-white/20 rounded-xl p-3.5 flex flex-col gap-2.5 transition-all relative group"
                  >
                    {/* Top Row: Employee Name & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-white truncate">{item.employee}</h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                            {item.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-300">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-amber-400" />
                            <strong>{item.from}</strong> → <strong>{item.to}</strong>
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-gray-400 border border-white/5">
                            {item.days} {item.days > 1 ? 'days' : 'day'}
                          </span>
                        </div>
                      </div>

                      {/* Status Tag or Actions */}
                      <div className="shrink-0">
                        {isApproved && (
                          <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow-sm">
                            <Check size={14} className="stroke-[3]" />
                            <span>Approved</span>
                          </div>
                        )}

                        {isRejected && (
                          <div className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow-sm">
                            <X size={14} className="stroke-[3]" />
                            <span>Not Approved</span>
                          </div>
                        )}

                        {isPending && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => decideLeave(item.id, 'Approved')}
                              className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-md"
                              title="Approve Leave"
                            >
                              <Check size={16} className="stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => decideLeave(item.id, 'Rejected')}
                              className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-md"
                              title="Reject Leave"
                            >
                              <X size={16} className="stroke-[2.5]" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Reason & Metadata Row */}
                    <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5 truncate">
                        <FileText size={12} className="text-gray-500 shrink-0" />
                        <span className="truncate">Reason: <em className="text-gray-200 font-normal">"{item.reason || 'No reason specified'}"</em></span>
                      </div>
                      <span className="text-[9px] font-mono text-gray-500 shrink-0">{item.id}</span>
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
