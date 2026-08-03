import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ComplaintCard from '../components/ComplaintCard';
import { useComplaints } from '../hooks/useComplaints';
import { getAllHRComplaints, updateHRStatus } from '../utils/api';
import { DEPARTMENTS, STATUSES, PRIORITIES } from '../utils/constants';
import { Search, Inbox } from 'lucide-react';

export default function HRDashboard() {
  const { complaints, setComplaints, loading } = useComplaints(getAllHRComplaints);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');

  async function handleStatusChange(id, newStatus) {
    try {
      const { data } = await updateHRStatus(id, newStatus);
      setComplaints(prev => prev.map(c => (c.id === id ? data : c)));
      toast.success('Status updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  }

  const filtered = useMemo(() => {
    return complaints.filter(c =>
      (!status || c.status === status) &&
      (!priority || c.priority === priority) &&
      (!department || c.department === department) &&
      (!search || c.token.toLowerCase().includes(search.toLowerCase()))
    );
  }, [complaints, status, priority, department, search]);

  return (
    <div className="min-h-screen hero-bg">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-white mb-1">HR Dashboard</h1>
        <p className="text-sm text-white/40 mb-6">All complaints raised to the HR department</p>

        {/* Filters */}
        <div className="glass rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by token..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500 transition"
            />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500">
            <option value="" className="bg-[#1e1e2e]">All Status</option>
            {STATUSES.map(s => <option key={s} value={s} className="bg-[#1e1e2e]">{s}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500">
            <option value="" className="bg-[#1e1e2e]">All Priority</option>
            {PRIORITIES.map(p => <option key={p.value} value={p.value} className="bg-[#1e1e2e]">{p.value}</option>)}
          </select>
          <select value={department} onChange={e => setDepartment(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500">
            <option value="" className="bg-[#1e1e2e]">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d} className="bg-[#1e1e2e]">{d}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center text-white/30 py-20">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center flex flex-col items-center gap-3">
            <Inbox className="text-white/20" size={40} />
            <p className="text-white/40">No complaints match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(c => (
              <ComplaintCard key={c.id} complaint={c} canUpdateStatus onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
