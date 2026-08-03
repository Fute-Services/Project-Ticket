import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ComplaintCard from '../components/ComplaintCard';
import { getMyHRComplaints, getMyITComplaints } from '../utils/api';
import { Plus, Wrench, Inbox } from 'lucide-react';

export default function EmployeeDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hr, it] = await Promise.all([getMyHRComplaints(), getMyITComplaints()]);
      const hrTagged = hr.data.map(c => ({ ...c, dept_tag: 'HR' }));
      const itTagged = it.data.map(c => ({ ...c, dept_tag: 'IT' }));
      const merged = [...hrTagged, ...itTagged].sort(
        (a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)
      );
      setComplaints(merged);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen hero-bg">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">My Complaints</h1>
            <p className="text-sm text-white/40 mt-1">Track everything you've raised to HR & IT</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/employee/complaint/hr')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 font-semibold text-sm transition"
            >
              <Plus size={16} /> HR Complaint
            </button>
            <button
              onClick={() => navigate('/employee/complaint/it')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 font-semibold text-sm transition"
            >
              <Wrench size={16} /> IT Complaint
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-white/30 py-20">Loading...</div>
        ) : complaints.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl p-12 text-center flex flex-col items-center gap-3">
            <Inbox className="text-white/20" size={40} />
            <p className="text-white/40">No complaints raised yet.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {complaints.map(c => (
              <ComplaintCard key={c.id} complaint={c} deptTag={c.dept_tag} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
