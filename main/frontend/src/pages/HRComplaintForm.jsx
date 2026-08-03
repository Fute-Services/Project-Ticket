import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import TokenDisplay from '../components/TokenDisplay';
import { submitHRComplaint } from '../utils/api';
import { DEPARTMENTS, PRIORITIES } from '../utils/constants';

export default function HRComplaintForm() {
  const [form, setForm] = useState({
    name: '', department: '', description: '', complaint_date: '', priority: 'P2',
  });
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const navigate = useNavigate();

  function update(field, value) {
    setForm(p => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await submitHRComplaint(form);
      setToken(data.token);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen hero-bg">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-white mb-1">Raise HR Complaint</h1>
          <p className="text-sm text-white/40 mb-6">Fill in the details below. Duration & timestamp are tracked automatically.</p>

          <form onSubmit={handleSubmit} className="glass rounded-3xl p-6 flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Name</label>
              <input
                type="text" required value={form.name}
                onChange={e => update('name', e.target.value)}
                placeholder="Your full name"
                className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-brand-500 transition text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Department</label>
              <select
                required value={form.department}
                onChange={e => update('department', e.target.value)}
                className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition text-sm"
              >
                <option value="" disabled className="bg-[#1e1e2e]">Select department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d} className="bg-[#1e1e2e]">{d}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Description</label>
              <textarea
                required rows={4} value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="Describe your complaint or query in detail"
                className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-brand-500 transition text-sm resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Date of Complaint</label>
              <input
                type="date" required value={form.complaint_date}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => update('complaint_date', e.target.value)}
                className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition text-sm [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Priority</label>
              <select
                required value={form.priority}
                onChange={e => update('priority', e.target.value)}
                className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition text-sm"
              >
                {PRIORITIES.map(p => <option key={p.value} value={p.value} className="bg-[#1e1e2e]">{p.label}</option>)}
              </select>
            </div>

            <button
              type="submit" disabled={loading}
              className="mt-2 w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold transition btn-glow disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </form>
        </motion.div>
      </main>

      {token && (
        <TokenDisplay token={token} onClose={() => navigate('/employee/dashboard')} />
      )}
    </div>
  );
}
