import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AppShell from '../components/AppShell';
import ComplaintCard from '../components/ComplaintCard';
import StatTile from '../components/StatTile';
import StatusBadge from '../components/StatusBadge';
import LoadMore from '../components/LoadMore';
import { useComplaints } from '../hooks/useComplaints';
import { useAuth } from '../context/AuthContext';
import { getMyHRComplaints, getMyITComplaints, getMyStats } from '../utils/api';
import { mergePages } from '../utils/paging';
import { greeting, timeAgo, formatDateTime } from '../utils/duration';
import { Plus, Wrench, Inbox, CircleDot, Loader, CheckCircle2, Layers } from 'lucide-react';

const EMPTY_STATS = { total: 0, pending: 0, in_progress: 0, completed: 0, recent: [] };

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(EMPTY_STATS);
  const [statsLoading, setStatsLoading] = useState(true);

  // One page from each department, merged newest-first
  const fetchMine = useCallback(async ({ cursor } = {}) => {
    const [hr, it] = await Promise.all([
      getMyHRComplaints({ cursor }),
      getMyITComplaints({ cursor }),
    ]);
    return {
      data: mergePages([
        { page: hr.data, tag: 'HR' },
        { page: it.data, tag: 'IT' },
      ]),
    };
  }, []);

  const { complaints, loading, loadingMore, hasMore, loadMore } = useComplaints(fetchMine, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getMyStats();
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) toast.error('We could not load your summary. Please try again in a few moments.');
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <AppShell>
      {/* Greeting */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="text-sm text-white/40">{greeting()} ☀</p>
          <h1 className="text-3xl font-bold text-white mt-1">Welcome back, {firstName}</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/employee/complaint/hr')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 font-semibold text-sm transition"
          >
            <Plus size={16} /> HR Ticket
          </button>
          <button
            onClick={() => navigate('/employee/complaint/it')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 font-semibold text-sm transition"
          >
            <Wrench size={16} /> IT Ticket
          </button>
        </div>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile label="Open" value={stats.pending} hint="Waiting to be picked up"
          icon={CircleDot} accent="text-yellow-400" loading={statsLoading} />
        <StatTile label="In Progress" value={stats.in_progress} hint="Someone is on it"
          icon={Loader} accent="text-blue-400" loading={statsLoading} />
        <StatTile label="Completed" value={stats.completed} hint="Resolved for you"
          icon={CheckCircle2} accent="text-green-400" loading={statsLoading} />
        <StatTile label="Total Raised" value={stats.total} hint="All time"
          icon={Layers} accent="text-white" loading={statsLoading} />
      </div>

      {/* Recent activity */}
      {stats.recent.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Recent Activity</h2>
          <div className="surface rounded-2xl divide-y divide-white/5">
            {stats.recent.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 flex-wrap">
                <span className="font-mono text-xs font-bold text-brand-500">{r.token}</span>
                <StatusBadge status={r.status} />
                <span className="text-sm text-white/50 truncate flex-1 min-w-[120px]">{r.description}</span>
                <span className="text-xs text-white/30 shrink-0" title={formatDateTime(r.updated_at)}>
                  {timeAgo(r.updated_at)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ticket list */}
      <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">My Tickets</h2>
      {loading ? (
        <div className="text-center text-white/30 py-20">Loading...</div>
      ) : complaints.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="surface rounded-3xl p-12 text-center flex flex-col items-center gap-3">
          <Inbox className="text-white/20" size={40} />
          <p className="text-white/40">No tickets yet. Raise one and we’ll track it for you.</p>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {complaints.map(c => (
              <ComplaintCard key={c.id} complaint={c} deptTag={c.dept_tag} />
            ))}
          </div>
          <LoadMore hasMore={hasMore} loading={loadingMore} onClick={loadMore} shown={complaints.length} />
        </>
      )}
    </AppShell>
  );
}
