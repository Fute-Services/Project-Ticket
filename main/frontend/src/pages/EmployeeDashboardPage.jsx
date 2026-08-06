import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import ItDeskLayout from '../components/ItDeskLayout';
import NewItTicketModal from '../components/NewItTicketModal';
import { StatCard } from '../components/ui';
import { Plus } from 'lucide-react';

const TICKET_STATUS_BADGE = {
  Open: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'In Progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Waiting Approval': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Closed: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

function MyTicketsView({ tickets, onNewTicket }) {
  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1.5">My Tickets</h1>
          <p className="text-xs text-gray-400">{tickets.length} tickets raised by you</p>
        </div>
        <button
          type="button"
          onClick={onNewTicket}
          className="bg-[#e86024] hover:bg-[#d4521a] text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Raise Ticket</span>
        </button>
      </div>

      <div className="bg-[#141418] border border-white/5 rounded-3xl p-5">
        {tickets.length === 0 ? (
          <p className="text-xs text-gray-500 py-8 text-center">
            You haven't raised any tickets yet. Click "Raise Ticket" to submit an issue to IT.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Token</th>
                  <th className="py-3 px-3">Issue</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-3 font-bold text-[#e86024]">{t.token}</td>
                    <td className="py-3.5 px-3 text-white">{t.title}</td>
                    <td className="py-3.5 px-3 text-gray-400">{t.dept}</td>
                    <td className="py-3.5 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap ${TICKET_STATUS_BADGE[t.status]}`}>
                        {t.status}
                      </span>
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

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const { tickets, addTicket } = useTickets();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Every employee shares the same underlying ticket list as IT's queue —
  // scope the view to tickets this person raised.
  const myTickets = useMemo(
    () => tickets.filter((t) => t.user === (user?.full_name || 'You')),
    [tickets, user]
  );

  function handleNewTicket(req) {
    addTicket(req, user?.full_name);
  }

  const searchIndex = useMemo(
    () => myTickets.map((t) => ({ group: 'Tickets', label: `${t.token} — ${t.title}`, sub: `${t.dept} · ${t.status}`, tab: 'tickets' })),
    [myTickets]
  );

  return (
    <ItDeskLayout activeTab={activeTab} setActiveTab={setActiveTab} searchIndex={searchIndex} role="employee">
      {activeTab === 'dashboard' && (
        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none mb-1">
                Welcome, {user?.full_name || 'there'}
              </h1>
              <p className="text-[11px] text-gray-400">Raise an IT issue and track it through to resolution.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsTicketModalOpen(true)}
              className="bg-[#e86024] hover:bg-[#d4521a] text-white font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Raise Ticket</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Total Tickets" value={myTickets.length} sub="raised by you" />
            <StatCard
              label="In Progress"
              value={myTickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length}
              sub="being worked"
            />
            <StatCard
              label="Resolved"
              value={myTickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length}
              sub="completed"
            />
          </div>

          <div className="bg-[#141418] border border-white/5 rounded-3xl p-5">
            <h3 className="font-extrabold text-sm text-white mb-4">Recent Tickets</h3>
            {myTickets.length === 0 ? (
              <p className="text-xs text-gray-500 py-4">
                Nothing here yet — raise a ticket and it'll show up in the IT queue right away.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {myTickets.slice(0, 5).map((t) => (
                  <div key={t.id} className="p-3 rounded-2xl bg-[#18181c] border border-white/5 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-white truncate">{t.title}</div>
                      <div className="text-[10px] text-gray-400">{t.token} · {t.dept}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${TICKET_STATUS_BADGE[t.status]}`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <MyTicketsView tickets={myTickets} onNewTicket={() => setIsTicketModalOpen(true)} />
      )}

      <NewItTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onSubmitSuccess={handleNewTicket}
      />
    </ItDeskLayout>
  );
}
