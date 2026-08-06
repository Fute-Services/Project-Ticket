import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import ItDeskLayout from '../components/ItDeskLayout';
import DonutChart from '../components/DonutChart';
import DataTransferModal from '../components/DataTransferModal';
import NewItTicketModal from '../components/NewItTicketModal';
import { Card, SectionHeader, StatCard } from '../components/ui';
import {
  assets,
  ASSET_TYPES,
  slaWeekly,
  resolutionByCategory,
  engineerPerformance,
  defaultItSettings,
  TICKET_PRIORITIES,
} from '../data/itMockData';
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Server,
  Monitor,
  Laptop,
  Printer,
  Wifi,
  Plus,
  Calendar,
  Search,
  Download,
} from 'lucide-react';

const TICKET_STATUSES = ['Open', 'In Progress', 'Waiting Approval', 'Resolved', 'Closed'];

function TicketsQueueView({ tickets, onStatusChange, onNewTicket }) {
  const [filter, setFilter] = useState('All');
  const visible = filter === 'All' ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1.5">Tickets Queue</h1>
          <p className="text-xs text-gray-400">{tickets.length} total tickets</p>
        </div>
        <button
          type="button"
          onClick={onNewTicket}
          className="bg-[#e86024] hover:bg-[#d4521a] text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>New Ticket</span>
        </button>
      </div>

      <div className="bg-[#141418] border border-white/5 rounded-3xl p-5">
        <div className="flex flex-wrap gap-2 mb-5">
          {['All', ...TICKET_STATUSES].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                filter === s ? 'bg-[#e86024] text-white' : 'bg-[#18181c] border border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="text-xs text-gray-500 py-8 text-center">No tickets match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Token</th>
                  <th className="py-3 px-3">Issue</th>
                  <th className="py-3 px-3">Requester</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visible.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-3 font-bold text-[#e86024]">{t.token}</td>
                    <td className="py-3.5 px-3 text-white">{t.title}</td>
                    <td className="py-3.5 px-3 text-gray-300">{t.user}</td>
                    <td className="py-3.5 px-3 text-gray-400">{t.dept}</td>
                    <td className="py-3.5 px-3">
                      <select
                        value={t.status}
                        onChange={(e) => onStatusChange(t.id, e.target.value)}
                        className="bg-[#18181c] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#e86024] cursor-pointer"
                      >
                        {TICKET_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalCenterView({ approvals, onApprove, onReject }) {
  const pending = approvals.filter((a) => a.status === 'pending');
  const decided = approvals.filter((a) => a.status !== 'pending');

  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1.5">Approval Center</h1>
        <p className="text-xs text-gray-400">{pending.length} pending · {decided.length} decided</p>
      </div>

      <div className="bg-[#141418] border border-white/5 rounded-3xl p-5">
        <h3 className="font-extrabold text-sm text-white mb-4">Pending Approval</h3>
        {pending.length === 0 ? (
          <p className="text-xs text-gray-500 py-4">Nothing waiting on you.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {pending.map((app) => (
              <div key={app.id} className="p-3.5 rounded-2xl bg-[#18181c] border border-white/5 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-white truncate">{app.title}</div>
                  <div className="text-[11px] text-gray-400 truncate">{app.sub}</div>
                  <div className="text-[10px] text-gray-500">Requested by {app.user} · {app.time}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onApprove(app.id)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold hover:bg-emerald-500/25 transition-colors cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(app.id)}
                    className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold hover:bg-red-500/25 transition-colors cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h3 className="font-extrabold text-sm text-white mb-4">Approval History</h3>
        {decided.length === 0 ? (
          <p className="text-xs text-gray-500 py-4">No decisions yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {decided.map((app) => (
              <div key={app.id} className="p-3.5 rounded-2xl bg-[#18181c] border border-white/5 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-white truncate">{app.title}</div>
                  <div className="text-[10px] text-gray-500">{app.user} · {app.time}</div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-bold capitalize shrink-0 ${
                    app.status === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}
                >
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DataRequestsView({ requests, onNewRequest }) {
  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1.5">Data Requests</h1>
          <p className="text-xs text-gray-400">{requests.length} transfer requests</p>
        </div>
        <button
          type="button"
          onClick={onNewRequest}
          className="bg-[#e86024] hover:bg-[#d4521a] text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
        >
          <Server size={15} />
          <span>New Data Request</span>
        </button>
      </div>

      <div className="bg-[#141418] border border-white/5 rounded-3xl p-5">
        {requests.length === 0 ? (
          <p className="text-xs text-gray-500 py-8 text-center">No data transfer requests yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {requests.map((d) => (
              <div key={d.id} className="p-3.5 rounded-2xl bg-[#18181c] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                    <Server size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{d.path}</div>
                    <div className="text-[10px] text-gray-400 truncate">{d.name}</div>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${
                    d.status === 'Completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : d.status === 'In Progress'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  }`}
                >
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const ASSET_TYPE_ICON = {
  Laptop,
  Desktop: Monitor,
  Server,
  Network: Wifi,
  Printer,
};

const ASSET_STATUS_COLOR = {
  'In Use': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Available: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Under Repair': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Retired: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

function AssetsView() {
  const [typeFilter, setTypeFilter] = useState('All');
  const [query, setQuery] = useState('');

  const visible = assets.filter((a) => {
    if (typeFilter !== 'All' && a.type !== typeFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      a.id.toLowerCase().includes(q) ||
      a.model.toLowerCase().includes(q) ||
      a.assignedTo.toLowerCase().includes(q) ||
      a.department.toLowerCase().includes(q)
    );
  });

  // Warranty is "expiring" if it lapses within 90 days of the demo date —
  // the whole point of tracking it is catching that before it lapses.
  const soon = new Date('2026-08-06');
  soon.setDate(soon.getDate() + 90);
  const expiring = assets.filter((a) => new Date(a.warrantyEnd) <= soon && a.status !== 'Retired').length;

  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1.5">Asset Management</h1>
        <p className="text-xs text-gray-400">
          {assets.length} assets tracked · {expiring} warranty expiring within 90 days
        </p>
      </div>

      {/* Counts per type */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ASSET_TYPES.map((type) => {
          const Icon = ASSET_TYPE_ICON[type];
          const count = assets.filter((a) => a.type === type).length;
          const inUse = assets.filter((a) => a.type === type && a.status === 'In Use').length;
          return (
            <div key={type} className="bg-[#141418] border border-white/5 rounded-2xl p-3.5 text-center">
              <Icon size={18} className="mx-auto text-gray-400 mb-1.5" />
              <div className="text-[10px] text-gray-400">{type}s</div>
              <div className="text-lg font-bold text-white mt-0.5">{count}</div>
              <div className="text-[10px] text-emerald-400">{inUse} in use</div>
            </div>
          );
        })}
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by asset ID, model, user, or department..."
              className="w-full bg-[#18181c] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e86024]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {['All', ...ASSET_TYPES].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                typeFilter === t ? 'bg-[#e86024] text-white' : 'bg-[#18181c] border border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {t === 'All' ? 'All' : `${t}s`}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="text-xs text-gray-500 py-8 text-center">No assets match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Asset ID</th>
                  <th className="py-3 px-3">Model</th>
                  <th className="py-3 px-3">Assigned To</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Purchased</th>
                  <th className="py-3 px-3">Warranty Until</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visible.map((a) => {
                  const expiringSoon = new Date(a.warrantyEnd) <= soon && a.status !== 'Retired';
                  return (
                    <tr key={a.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-3 font-bold text-[#e86024]">{a.id}</td>
                      <td className="py-3.5 px-3 text-white">{a.model}</td>
                      <td className="py-3.5 px-3 text-gray-300">{a.assignedTo}</td>
                      <td className="py-3.5 px-3 text-gray-400">{a.department}</td>
                      <td className="py-3.5 px-3 text-gray-500">{a.purchaseDate}</td>
                      <td className={`py-3.5 px-3 ${expiringSoon ? 'text-amber-400 font-semibold' : 'text-gray-500'}`}>
                        {a.warrantyEnd}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap ${ASSET_STATUS_COLOR[a.status]}`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function ReportsView() {
  const totalMet = slaWeekly.reduce((s, w) => s + w.met, 0);
  const totalBreached = slaWeekly.reduce((s, w) => s + w.breached, 0);
  const slaPct = Math.round((totalMet / (totalMet + totalBreached)) * 100);
  const avgResolution = (slaWeekly.reduce((s, w) => s + w.avgHours, 0) / slaWeekly.length).toFixed(1);
  const maxWeekTotal = Math.max(...slaWeekly.map((w) => w.met + w.breached));

  function exportCsv() {
    const headers = ['Week', 'SLA Met', 'SLA Breached', 'Avg Resolution (hrs)'];
    const rows = slaWeekly.map((w) => [w.week, w.met, w.breached, w.avgHours]);
    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'it-sla-report.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1.5">Reports & Logs</h1>
          <p className="text-xs text-gray-400">SLA compliance and resolution velocity, last 6 weeks</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="bg-[#e86024] hover:bg-[#d4521a] text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
        >
          <Download size={14} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard icon={ShieldCheck} label="SLA Compliance" value={`${slaPct}%`} sub="last 6 weeks" accent="#10b981" />
        <StatCard icon={CheckCircle2} label="Tickets Resolved" value={totalMet + totalBreached} sub="last 6 weeks" accent="#3b82f6" />
        <StatCard icon={AlertTriangle} label="SLA Breaches" value={totalBreached} sub="needs review" accent="#ef4444" />
        <StatCard icon={Clock} label="Avg Resolution" value={`${avgResolution}h`} sub="mean time to resolve" accent="#f97316" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <SectionHeader title="Weekly SLA Performance" subtitle="Met vs breached per week" />
          <div className="flex items-end justify-between gap-2 h-[160px] pt-2">
            {slaWeekly.map((w) => {
              const total = w.met + w.breached;
              return (
                <div key={w.week} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-semibold">{total}</span>
                  <div
                    className="w-full max-w-[26px] flex flex-col justify-end rounded-t-lg overflow-hidden"
                    style={{ height: `${(total / maxWeekTotal) * 110}px` }}
                  >
                    <div className="w-full bg-red-500/70" style={{ height: `${(w.breached / total) * 100}%` }} />
                    <div className="w-full bg-emerald-500/80" style={{ height: `${(w.met / total) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold">{w.week}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 pt-3 mt-3 border-t border-white/5 text-[10px] text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Met</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Breached</span>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Resolution Time by Category" subtitle="Average hours to close" />
          <div className="flex flex-col gap-3">
            {resolutionByCategory.map((c) => {
              const maxHours = Math.max(...resolutionByCategory.map((r) => r.avgHours));
              return (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-300 w-40 shrink-0 truncate">{c.category}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#e86024] to-amber-400 rounded-full"
                      style={{ width: `${(c.avgHours / maxHours) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-white w-12 text-right shrink-0">{c.avgHours}h</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader title="Engineer Performance" subtitle="Resolution volume and SLA adherence" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Engineer</th>
                <th className="py-3 px-3">Tickets Resolved</th>
                <th className="py-3 px-3">Avg Resolution</th>
                <th className="py-3 px-3">SLA Adherence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {engineerPerformance.map((e) => (
                <tr key={e.engineer} className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-3 font-bold text-white">{e.engineer}</td>
                  <td className="py-3.5 px-3 text-gray-300">{e.resolved}</td>
                  <td className="py-3.5 px-3 text-gray-400">{e.avgHours}h</td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${e.slaPct >= 95 ? 'bg-emerald-500' : e.slaPct >= 90 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${e.slaPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-white">{e.slaPct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 p-3 rounded-2xl bg-[#18181c] border border-white/5 hover:border-white/15 transition-colors cursor-pointer text-left"
    >
      <div className="min-w-0">
        <div className="text-xs font-semibold text-white">{label}</div>
        {hint && <div className="text-[11px] text-gray-500 mt-0.5">{hint}</div>}
      </div>
      <span
        className={`w-9 h-5 rounded-full shrink-0 flex items-center px-0.5 transition-colors ${
          checked ? 'bg-[#e86024] justify-end' : 'bg-white/10 justify-start'
        }`}
      >
        <span className="w-4 h-4 rounded-full bg-white" />
      </span>
    </button>
  );
}

function SettingsView() {
  const [settings, setSettings] = useState(defaultItSettings);
  const [saved, setSaved] = useState(false);

  function set(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  const slaFields = [
    { key: 'slaCriticalHours', label: 'Critical' },
    { key: 'slaHighHours', label: 'High' },
    { key: 'slaMediumHours', label: 'Medium' },
    { key: 'slaLowHours', label: 'Low' },
  ];

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1.5">Settings</h1>
          <p className="text-xs text-gray-400">Service desk configuration</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-[11px] text-emerald-400 font-semibold">Applied for this session</span>}
          <button
            type="button"
            onClick={() => setSaved(true)}
            className="bg-[#e86024] hover:bg-[#d4521a] text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
          >
            <CheckCircle2 size={14} />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>

      {/* No settings endpoint exists on the backend yet, so say plainly that
          these don't persist rather than implying a save that never happens. */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20">
        <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-200/90 leading-relaxed">
          These preferences apply to the current session only. Persisting them needs a settings endpoint on the
          backend, which isn't built yet — they'll reset on reload.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <SectionHeader title="SLA Targets" subtitle="Hours to resolve, by ticket priority" />
          <div className="grid grid-cols-2 gap-3">
            {slaFields.map(({ key, label }) => (
              <label key={key} className="flex flex-col gap-1.5 text-xs">
                <span className="text-gray-400 font-medium">{label}</span>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    value={settings[key]}
                    onChange={(e) => set(key, Number(e.target.value))}
                    className="w-full bg-[#18181c] border border-white/10 rounded-xl px-3.5 py-2.5 pr-12 text-xs text-white focus:outline-none focus:border-[#e86024] transition-colors"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 pointer-events-none">
                    hours
                  </span>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="text-gray-400 font-medium">Default priority for new tickets</span>
              <select
                value={settings.defaultTicketPriority}
                onChange={(e) => set('defaultTicketPriority', e.target.value)}
                className="w-full bg-[#18181c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#e86024] cursor-pointer"
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <SectionHeader title="Notifications" />
            <div className="flex flex-col gap-2.5">
              <Toggle
                checked={settings.notifyOnCritical}
                onChange={(v) => set('notifyOnCritical', v)}
                label="Alert on critical tickets"
                hint="Notify the on-call engineer immediately"
              />
              <Toggle
                checked={settings.notifyOnApproval}
                onChange={(v) => set('notifyOnApproval', v)}
                label="Alert on approval requests"
                hint="Notify approvers when a request needs sign-off"
              />
            </div>
          </Card>

          <Card>
            <SectionHeader title="Workflow" />
            <div className="flex flex-col gap-2.5">
              <Toggle
                checked={settings.autoAssignTickets}
                onChange={(v) => set('autoAssignTickets', v)}
                label="Auto-assign new tickets"
                hint="Route by category to the least-loaded engineer"
              />
              <Toggle
                checked={settings.requireApprovalForDataTransfer}
                onChange={(v) => set('requireApprovalForDataTransfer', v)}
                label="Require approval for data transfers"
                hint="Server-to-server copies need sign-off before running"
              />
              <Toggle
                checked={settings.requireApprovalForSoftware}
                onChange={(v) => set('requireApprovalForSoftware', v)}
                label="Require approval for software installs"
                hint="License-bearing software needs sign-off"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Approval Requests state
  const [approvals, setApprovals] = useState([
    {
      id: 1,
      title: 'Software Installation',
      sub: 'Visual Studio Code',
      user: 'Mike Johnson',
      time: '1h ago',
      status: 'pending',
    },
    {
      id: 2,
      title: 'Data Transfer',
      sub: 'Server 70 to Server 131',
      user: 'Robert Brown',
      time: '2h ago',
      status: 'pending',
    },
    {
      id: 3,
      title: 'New Network Request',
      sub: 'Additional LAN Port',
      user: 'Sarah Wilson',
      time: '3h ago',
      status: 'pending',
    },
    {
      id: 4,
      title: 'VPN Access Request',
      sub: 'New VPN for John Doe',
      user: 'John Doe',
      time: '5h ago',
      status: 'pending',
    },
  ]);

  function handleApprove(id) {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item))
    );
  }

  function handleReject(id) {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'rejected' } : item))
    );
  }

  // Data Requests state
  const [dataRequests, setDataRequests] = useState([
    { id: 1, path: 'Server 70  →  Server 131', name: 'Project Data', status: 'In Progress' },
    { id: 2, path: 'Server 50  →  Server 70', name: 'Backup Files', status: 'Completed' },
    { id: 3, path: 'Server 29  →  Server 131', name: 'Client Records', status: 'Open' },
    { id: 4, path: 'Anima  →  Server 70', name: 'Media Files', status: 'In Progress' },
    { id: 5, path: 'Server 131  →  Anima', name: 'Reports', status: 'Waiting Approval' },
  ]);

  function handleNewDataRequest(req) {
    setDataRequests((prev) => [
      {
        id: Date.now(),
        path: `${req.source}  →  ${req.destination}`,
        name: req.folder || 'Data Copy',
        status: req.status || 'Waiting Approval',
      },
      ...prev,
    ]);
  }

  // Donut chart data definitions
  const categoryData = [
    { label: 'Laptop/Desktop Issues', value: 99, percent: 40, color: '#f97316' },
    { label: 'Network Issues', value: 62, percent: 25, color: '#3b82f6' },
    { label: 'Software Requests', value: 37, percent: 15, color: '#a855f7' },
    { label: 'VPN Requests', value: 25, percent: 10, color: '#06b6d4' },
    { label: 'Data Requests', value: 25, percent: 10, color: '#10b981' },
  ];

  const statusData = [
    { label: 'Open', value: 52, percent: 21, color: '#f97316' },
    { label: 'In Progress', value: 68, percent: 27, color: '#3b82f6' },
    { label: 'Waiting for Approval', value: 8, percent: 3, color: '#eab308' },
    { label: 'Resolved', value: 186, percent: 75, color: '#10b981' },
    { label: 'Closed', value: 120, percent: 48, color: '#8b5cf6' },
  ];

  // Shared with the Employee dashboard — a ticket raised there appears
  // here immediately, and a status change made here reflects there too.
  const { tickets: recentTickets, addTicket, changeStatus: changeTicketStatus } = useTickets();

  function handleNewTicket(req) {
    addTicket(req, user?.full_name);
  }

  const searchIndex = useMemo(
    () => [
      ...recentTickets.map((t) => ({ group: 'Tickets', label: `${t.token} — ${t.title}`, sub: `${t.user} · ${t.status}`, tab: 'tickets' })),
      ...approvals.map((a) => ({ group: 'Approvals', label: a.title, sub: `${a.user} · ${a.status}`, tab: 'approval' })),
      ...dataRequests.map((d) => ({ group: 'Data Requests', label: d.path, sub: `${d.name} · ${d.status}`, tab: 'datarequests' })),
    ],
    [recentTickets, approvals, dataRequests]
  );

  return (
    <ItDeskLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      searchIndex={searchIndex}
      role="it"
      approvalCount={approvals.filter((a) => a.status === 'pending').length}
    >
      {activeTab === 'dashboard' && (
        <div className="w-full flex flex-col gap-3.5 h-full max-h-full justify-between overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none mb-1">IT Service Desk</h1>
              <p className="text-[11px] text-gray-400">Overview of active tickets, pending approvals, and IT infrastructure.</p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsDataModalOpen(true)}
                className="bg-[#18181c] border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Server size={15} />
                <span>Request Data Transfer</span>
              </button>
              <button
                type="button"
                onClick={() => setIsTicketModalOpen(true)}
                className="bg-[#e86024] hover:bg-[#d4521a] text-white font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>New Ticket</span>
              </button>
            </div>
          </div>

          {/* Key Stat Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <StatCard label="Total Tickets" value={recentTickets.length} sub="all tickets" />
            <StatCard label="Open Tickets" value={recentTickets.filter((t) => t.status === 'Open').length} sub="active" />
            <StatCard label="Pending Approval" value={approvals.filter((a) => a.status === 'pending').length} sub="awaiting" />
            <StatCard label="Resolved Tickets" value={recentTickets.filter((t) => t.status === 'Resolved').length} sub="completed" />
            <StatCard label="In Progress" value={recentTickets.filter((t) => t.status === 'In Progress').length} sub="working" />
            <StatCard label="SLA Compliance" value="96%" sub="last 7 days" />
          </div>

          {/* Donut Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <DonutChart title="Tickets by Category" total={248} data={categoryData} />
            <DonutChart title="Tickets by Status" total={248} data={statusData} />
          </div>

          {/* Assets Overview */}
          <Card className="!p-3.5">
            <SectionHeader
              title="Assets Overview"
              action={
                <button
                  type="button"
                  onClick={() => setActiveTab('assets')}
                  className="text-xs text-[#e86024] font-semibold hover:underline cursor-pointer"
                >
                  View All
                </button>
              }
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-center mb-2.5">
              <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                <Laptop size={16} className="mx-auto text-gray-400 mb-0.5" />
                <div className="text-[10px] text-gray-400">Laptops</div>
                <div className="text-xs font-bold text-white mt-0.5">120</div>
              </div>
              <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                <Monitor size={16} className="mx-auto text-gray-400 mb-0.5" />
                <div className="text-[10px] text-gray-400">Desktops</div>
                <div className="text-xs font-bold text-white mt-0.5">85</div>
              </div>
              <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                <Server size={16} className="mx-auto text-gray-400 mb-0.5" />
                <div className="text-[10px] text-gray-400">Servers</div>
                <div className="text-xs font-bold text-white mt-0.5">28</div>
              </div>
              <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                <Wifi size={16} className="mx-auto text-gray-400 mb-0.5" />
                <div className="text-[10px] text-gray-400">Network</div>
                <div className="text-xs font-bold text-white mt-0.5">18</div>
              </div>
              <div className="p-2 rounded-xl bg-[#18181c] border border-white/5">
                <Printer size={16} className="mx-auto text-gray-400 mb-0.5" />
                <div className="text-[10px] text-gray-400">Printers</div>
                <div className="text-xs font-bold text-white mt-0.5">12</div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Calendar size={14} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Next maintenance: Server Backup Schedule</div>
                  <div className="text-[10px] text-gray-400">May 16, 2026 · 01:00 AM</div>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold shrink-0">
                Scheduled
              </span>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'tickets' && (
        <TicketsQueueView tickets={recentTickets} onStatusChange={changeTicketStatus} onNewTicket={() => setIsTicketModalOpen(true)} />
      )}

      {activeTab === 'approval' && (
        <ApprovalCenterView approvals={approvals} onApprove={handleApprove} onReject={handleReject} />
      )}

      {activeTab === 'datarequests' && (
        <DataRequestsView requests={dataRequests} onNewRequest={() => setIsDataModalOpen(true)} />
      )}

      {activeTab === 'assets' && <AssetsView />}

      {activeTab === 'reports' && <ReportsView />}

      {activeTab === 'settings' && <SettingsView />}

      {/* Modals */}
      <DataTransferModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onSubmitSuccess={handleNewDataRequest}
      />
      <NewItTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onSubmitSuccess={handleNewTicket}
      />
    </ItDeskLayout>
  );
}
