import React, { useState } from 'react';
import {
  Cpu,
  Server,
  Clock,
  Laptop,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  ShieldCheck,
  Zap,
  TrendingUp,
  Activity,
} from 'lucide-react';

const INITIAL_IT_COMPLAINTS = [
  {
    id: 'FT-IT-1049',
    name: 'Rahul Sen',
    department: 'Engineering',
    category: 'Server & Cloud',
    issue: 'AWS Staging Server High CPU Utilization & Memory Spike (98%)',
    priority: 'High',
    submittedAt: '1 hour ago',
    status: 'Pending',
  },
  {
    id: 'FT-IT-1033',
    name: 'Sneha Iyer',
    department: 'Engineering',
    category: 'Hardware',
    issue: 'MacBook Pro M2 Display flickering & Battery Thermal Throttling',
    priority: 'High',
    submittedAt: '3 hours ago',
    status: 'In Progress',
  },
  {
    id: 'FT-IT-1021',
    name: 'Devansh Gupta',
    department: 'Sales',
    category: 'Network & VPN',
    issue: 'OpenVPN Client SSL Certificate Expiry & Connection Failure',
    priority: 'Medium',
    submittedAt: '5 hours ago',
    status: 'Pending',
  },
  {
    id: 'FT-IT-1008',
    name: 'Ananya Rao',
    department: 'Marketing',
    category: 'Software Licensing',
    issue: 'Figma Enterprise Workspace Seat Renewal & Asset Permission',
    priority: 'Low',
    submittedAt: '1 day ago',
    status: 'Resolved',
  },
];

const HARDWARE_PROCUREMENT_LOGS = [
  {
    item: '3x MacBook Pro M2 (16GB/512GB)',
    requestedFor: 'Engineering New Joiners Batch',
    estimatedCost: '₹4.5 Lakh',
    status: 'Approved & Dispatched',
    date: 'Yesterday',
  },
  {
    item: '4x Dell UltraSharp 27" 4K Monitors',
    requestedFor: 'UI/UX Design & Branding Hub',
    estimatedCost: '₹1.2 Lakh',
    status: 'Procurement In Progress',
    date: '2 days ago',
  },
  {
    item: 'Production Server IAM Access Grant',
    requestedFor: 'Arjun Verma (On-Call Rotation)',
    estimatedCost: 'N/A (Access Control)',
    status: 'Access Granted',
    date: '3 days ago',
  },
];

const TICKET_CATEGORIES = [
  { category: 'Hardware & Device Repair', count: 18, pct: 40, color: 'from-cyan-500 to-blue-500' },
  { category: 'Software & Tools Licensing', count: 14, pct: 30, color: 'from-purple-500 to-indigo-500' },
  { category: 'Network & VPN Access', count: 9, pct: 20, color: 'from-teal-500 to-emerald-500' },
  { category: 'System Security Credentials', count: 5, pct: 10, color: 'from-amber-500 to-orange-500' },
];

export default function FounderItView() {
  const [complaints, setComplaints] = useState(INITIAL_IT_COMPLAINTS);

  const pendingCount = complaints.filter((c) => c.status === 'Pending').length;
  const inProgressCount = complaints.filter((c) => c.status === 'In Progress').length;

  const handleUpdateStatus = (id, newStatus) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Section Header */}
      <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-600 flex items-center justify-center text-white shadow-xl border border-white/20">
            <Cpu size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">IT Service Desk Overview</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Infrastructure SLA, active helpdesk tickets, device allocation, and procurement status
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10 self-stretch sm:self-auto justify-end">
          <span className="text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            ● 99.9% System Uptime
          </span>
        </div>
      </div>

      {/* 1. 📊 EXECUTIVE IT METRIC CARDS (TOP HEADER - 4 NUMBERS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: System Uptime SLA */}
        <div className="bg-[#141418] border border-white/10 hover:border-white/20 rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">System Uptime SLA</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Activity size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">99.9%</span>
            <span className="text-xs font-semibold text-gray-400">Servers Online</span>
          </div>
        </div>

        {/* Card 2: Active IT Tickets */}
        <div className="bg-[#141418] border border-white/10 hover:border-white/20 rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Active IT Tickets</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Cpu size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-400">{complaints.length}</span>
            <span className="text-xs font-semibold text-amber-400">{pendingCount} Pending</span>
          </div>
        </div>

        {/* Card 3: Avg SLA Resolution Time */}
        <div className="bg-[#141418] border border-white/10 hover:border-white/20 rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Avg SLA Resolution</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">1.4 HRS</span>
            <span className="text-xs font-semibold text-emerald-400">-20% vs SLA</span>
          </div>
        </div>

        {/* Card 4: IT Assets Issued */}
        <div className="bg-[#141418] border border-white/10 hover:border-white/20 rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">IT Assets Issued</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Laptop size={14} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-400">38 / 45</span>
            <span className="text-xs font-semibold text-gray-400">Devices in use</span>
          </div>
        </div>
      </div>

      {/* 2. 💻 TICKET CATEGORY BREAKDOWN */}
      <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 flex flex-col gap-3.5">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div>
            <h3 className="text-sm font-black text-white">IT Helpdesk Ticket Category Breakdown</h3>
            <p className="text-[11px] text-gray-400">Distribution of support requests by technical domain</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300">
            Total 46 Tickets Logged
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {TICKET_CATEGORIES.map((item) => (
            <div key={item.category} className="flex items-center gap-3">
              <span className="text-xs text-gray-300 w-44 shrink-0 truncate font-semibold">{item.category}</span>
              <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div
                  className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
              <span className="text-xs font-black text-white w-14 text-right shrink-0">{item.count} tickets ({item.pct}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 🚨 CRITICAL IT COMPLAINTS & 4. ⚡ HARDWARE PROCUREMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. CRITICAL IT COMPLAINTS & ESCALATIONS */}
        <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white shadow-md">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  Critical IT Complaints & Escalations
                  {pendingCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                      {pendingCount} Pending
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-gray-400">High SLA priority hardware and infrastructure tickets</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {complaints.map((item) => {
              const isResolved = item.status === 'Resolved';
              const isInProgress = item.status === 'In Progress';
              const isPending = item.status === 'Pending';

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

                    <div className="shrink-0 flex items-center gap-1">
                      {isResolved ? (
                        <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold rounded-lg flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          Resolved
                        </span>
                      ) : isInProgress ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.id, 'Resolved')}
                          className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[10px] font-black rounded-lg transition-all cursor-pointer shadow-sm"
                        >
                          Mark Resolved
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.id, 'In Progress')}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-black rounded-lg transition-all cursor-pointer shadow-sm"
                        >
                          In Progress
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-gray-500 pt-1.5 border-t border-white/5">
                    <span>Ticket ID: <strong>{item.id}</strong> · {item.category}</span>
                    <span>{item.submittedAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. ⚡ HARDWARE PROCUREMENT & SYSTEM ACCESS LOG */}
        <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                <HardDrive size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Hardware Procurement & Access Log</h3>
                <p className="text-[11px] text-gray-400">Equipment orders & critical system grants</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {HARDWARE_PROCUREMENT_LOGS.map((item) => (
              <div key={item.item} className="bg-[#1a1a20] border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-white truncate">{item.item}</h4>
                  <p className="text-[11px] text-gray-300 mt-0.5">For: <strong>{item.requestedFor}</strong></p>
                  <span className="text-[9px] text-gray-400 block mt-1">
                    Cost: <strong className="text-emerald-400">{item.estimatedCost}</strong> · {item.date}
                  </span>
                </div>

                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 shrink-0">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
