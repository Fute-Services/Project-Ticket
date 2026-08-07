import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { useApprovals } from '../context/ApprovalContext';
import ItDeskLayout from '../components/ItDeskLayout';
import DonutChart from '../components/DonutChart';
import DataTransferModal from '../components/DataTransferModal';
import AssetFormModal from '../components/AssetFormModal';
import { Card, SectionHeader, StatCard } from '../components/ui';
import {
  assets as SEED_ASSETS,
  ASSET_TYPES,
  slaWeekly,
  resolutionByCategory,
} from '../data/itMockData';
import {
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
  Pencil,
  Trash2,
  Search,
  Download,
  Mail,
  BadgeCheck,
} from 'lucide-react';

const TICKET_STATUSES = ['Open', 'In Progress', 'Waiting Approval', 'Resolved', 'Closed'];

function TicketsQueueView({ tickets, onStatusChange }) {
  const [filter, setFilter] = useState('All');
  const visible = filter === 'All' ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1.5">Tickets Queue</h1>
          <p className="text-xs text-gray-400">{tickets.length} total tickets</p>
        </div>
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

const APPROVAL_FORM_EMPTY = { title: '', sub: '', requestedBy: '', priority: 'medium' };

function ApprovalCenterView() {
  const { approvals, submitApproval } = useApprovals();
  const itApprovals = approvals.filter((a) => a.source === 'IT');
  const pendingFounder = itApprovals.filter((a) => a.status === 'pending_founder');
  const decided = itApprovals.filter((a) => a.status !== 'pending_founder');
  const [form, setForm] = useState(APPROVAL_FORM_EMPTY);

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    submitApproval({ ...form, source: 'IT' });
    setForm(APPROVAL_FORM_EMPTY);
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1.5">Approval Center</h1>
        <p className="text-xs text-gray-400">{pendingFounder.length} awaiting founder sign-off · {decided.length} decided</p>
      </div>

      <Card>
        <h3 className="font-extrabold text-sm text-white mb-3">Send for Founder Approval</h3>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Request title"
            className="bg-[#18181c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e86024]"
          />
          <input
            value={form.requestedBy}
            onChange={(e) => setForm((f) => ({ ...f, requestedBy: e.target.value }))}
            placeholder="Requested by"
            className="bg-[#18181c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e86024]"
          />
          <input
            value={form.sub}
            onChange={(e) => setForm((f) => ({ ...f, sub: e.target.value }))}
            placeholder="Details"
            className="sm:col-span-2 bg-[#18181c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e86024]"
          />
          <button
            type="submit"
            className="sm:col-span-2 bg-[#e86024] hover:bg-[#d4521a] text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Send for Founder Approval
          </button>
        </form>
      </Card>

      <div className="bg-[#141418] border border-white/5 rounded-3xl p-5">
        <h3 className="font-extrabold text-sm text-white mb-4">Awaiting Founder Sign-off</h3>
        {pendingFounder.length === 0 ? (
          <p className="text-xs text-gray-500 py-4">Nothing waiting on the founder right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {pendingFounder.map((app) => (
              <div key={app.id} className="p-3.5 rounded-2xl bg-[#18181c] border border-white/5 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-white truncate">{app.title}</div>
                  <div className="text-[11px] text-gray-400 truncate">{app.sub}</div>
                  <div className="text-[10px] text-gray-500">Requested by {app.requestedBy} · {app.timestamp}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold capitalize shrink-0 bg-amber-500/10 text-amber-400 border-amber-500/20">
                  Pending Founder
                </span>
              </div>
            ))}
          </div>
        )}

        <h3 className="font-extrabold text-sm text-white mb-4">Decision History</h3>
        {decided.length === 0 ? (
          <p className="text-xs text-gray-500 py-4">No decisions yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {decided.map((app) => (
              <div key={app.id} className="p-3.5 rounded-2xl bg-[#18181c] border border-white/5 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-white truncate">{app.title}</div>
                  <div className="text-[10px] text-gray-500">{app.requestedBy} · {app.timestamp}</div>
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
  const [assets, setAssets] = useState(SEED_ASSETS);
  const [typeFilter, setTypeFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

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

  function openAddModal() {
    setEditingAsset(null);
    setModalOpen(true);
  }

  function openEditModal(asset) {
    setEditingAsset(asset);
    setModalOpen(true);
  }

  function handleSubmit(asset) {
    setAssets((prev) =>
      editingAsset ? prev.map((a) => (a.id === editingAsset.id ? asset : a)) : [asset, ...prev]
    );
  }

  function handleDelete(id) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1.5">Asset Management</h1>
          <p className="text-xs text-gray-400">
            {assets.length} assets tracked · {expiring} warranty expiring within 90 days
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="bg-[#e86024] hover:bg-[#d4521a] text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
        >
          <Plus size={15} />
          <span>Add Asset</span>
        </button>
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
                  <th className="py-3 px-3">Actions</th>
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
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(a)}
                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(a.id)}
                            className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 flex items-center justify-center cursor-pointer transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AssetFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialAsset={editingAsset}
        nextId={`AST-${1000 + assets.length + 1}`}
      />
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
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const { approvals } = useApprovals();
  const itPendingFounder = approvals.filter((a) => a.source === 'IT' && a.status === 'pending_founder').length;

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
  const { tickets: recentTickets, changeStatus: changeTicketStatus } = useTickets();

  const searchIndex = useMemo(
    () => [
      ...recentTickets.map((t) => ({ group: 'Tickets', label: `${t.token} — ${t.title}`, sub: `${t.user} · ${t.status}`, tab: 'tickets' })),
      ...approvals.filter((a) => a.source === 'IT').map((a) => ({ group: 'Approvals', label: a.title, sub: `${a.requestedBy} · ${a.status}`, tab: 'approval' })),
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
      approvalCount={itPendingFounder}
    >
      {activeTab === 'dashboard' && (
        <div className="w-full flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none mb-1">IT Service Desk</h1>
              <p className="text-[11px] text-gray-400">Overview of active tickets, pending approvals, and IT infrastructure.</p>
            </div>
            <div className="flex items-center gap-2.5">
              {emailVerified ? (
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2">
                  <BadgeCheck size={15} />
                  <span>Verified</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setEmailVerified(true)}
                  className="bg-[#18181c] border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Mail size={15} />
                  <span>Send Verification Email</span>
                </button>
              )}
            </div>
          </div>

          {/* Key Stat Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <StatCard label="Total Tickets" value={recentTickets.length} sub="all tickets" />
            <StatCard label="Open Tickets" value={recentTickets.filter((t) => t.status === 'Open').length} sub="active" />
            <StatCard label="Pending Approval" value={itPendingFounder} sub="awaiting founder" />
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
          </Card>
        </div>
      )}

      {activeTab === 'tickets' && (
        <TicketsQueueView tickets={recentTickets} onStatusChange={changeTicketStatus} />
      )}

      {activeTab === 'approval' && <ApprovalCenterView />}

      {activeTab === 'datarequests' && (
        <DataRequestsView requests={dataRequests} onNewRequest={() => setIsDataModalOpen(true)} />
      )}

      {activeTab === 'assets' && <AssetsView />}

      {activeTab === 'reports' && <ReportsView />}

      {/* Modals */}
      <DataTransferModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onSubmitSuccess={handleNewDataRequest}
      />
    </ItDeskLayout>
  );
}
