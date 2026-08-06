import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ItDeskLayout from '../components/ItDeskLayout';
import DonutChart from '../components/DonutChart';
import DataTransferModal from '../components/DataTransferModal';
import NewItTicketModal from '../components/NewItTicketModal';
import { Card, SectionHeader, StatCard } from '../components/ui';
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
  Package,
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

const COMING_SOON_LABEL = {
  assets: 'Asset Management',
  reports: 'Reports & Logs',
  settings: 'Settings',
};

// Honest placeholder — same principle as the disabled "Forgot password" on
// the login page: no backing data/backend exists for this yet, so say so
// instead of showing fake numbers that look live.
function ComingSoonView({ tab }) {
  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#141418] border border-white/5 rounded-3xl p-10 flex flex-col items-center text-center gap-2">
        <Package size={28} className="text-gray-600 mb-2" />
        <h2 className="text-lg font-bold text-white">{COMING_SOON_LABEL[tab]} isn't available yet</h2>
        <p className="text-xs text-gray-500 max-w-sm">
          This module isn't built yet. It's tracked in the IT department requirements doc for a future pass.
        </p>
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

  const STATUS_COLOR = {
    Open: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'In Progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Waiting Approval': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    Resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Closed: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  const [recentTickets, setRecentTickets] = useState([
    {
      id: 1,
      token: 'INC-1024',
      title: 'Laptop hanging and slow performance',
      user: 'John Doe',
      dept: 'IT Support',
      status: 'In Progress',
      statusColor: STATUS_COLOR['In Progress'],
    },
    {
      id: 2,
      token: 'INC-1023',
      title: 'Internet connection keeps dropping',
      user: 'Jane Smith',
      dept: 'Network',
      status: 'Open',
      statusColor: STATUS_COLOR.Open,
    },
    {
      id: 3,
      token: 'REQ-1018',
      title: 'Request for Adobe Photoshop installation',
      user: 'Mike Johnson',
      dept: 'Software',
      status: 'Waiting Approval',
      statusColor: STATUS_COLOR['Waiting Approval'],
    },
    {
      id: 4,
      token: 'VPN-1012',
      title: 'VPN access not working',
      user: 'Sarah Wilson',
      dept: 'VPN',
      status: 'In Progress',
      statusColor: STATUS_COLOR['In Progress'],
    },
    {
      id: 5,
      token: 'DR-1009',
      title: 'Data transfer from Server 70 to 131',
      user: 'Robert Brown',
      dept: 'Data Team',
      status: 'Open',
      statusColor: STATUS_COLOR.Open,
    },
  ]);

  function handleNewTicket(req) {
    setRecentTickets((prev) => [
      {
        id: Date.now(),
        token: `REQ-${1025 + prev.length}`,
        title: req.description,
        user: user?.full_name || 'You',
        dept: req.department || req.category,
        status: 'Open',
        statusColor: STATUS_COLOR.Open,
      },
      ...prev,
    ]);
  }

  function changeTicketStatus(id, status) {
    setRecentTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status, statusColor: STATUS_COLOR[status] } : t))
    );
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
    <ItDeskLayout activeTab={activeTab} setActiveTab={setActiveTab} searchIndex={searchIndex}>
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

      {(activeTab === 'assets' || activeTab === 'reports' || activeTab === 'settings') && (
        <ComingSoonView tab={activeTab} />
      )}

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
