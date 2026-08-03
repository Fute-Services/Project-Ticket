import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import TokenDisplay from '../components/TokenDisplay';
import { submitITComplaint } from '../utils/api';
import { DEPARTMENTS, PRIORITIES, IT_CATEGORIES } from '../utils/constants';

export default function ITComplaintForm() {
  const [form, setForm] = useState({
    name: '', department: '', category: '', sub_category: '',
    description: '', complaint_date: '', priority: 'P2', approval: 'false',
  });
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const navigate = useNavigate();

  function update(field, value) {
    setForm(p => {
      const next = { ...p, [field]: value };
      if (field === 'category') next.sub_category = ''; // reset dependent field
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await submitITComplaint({ ...form, approval: form.approval === 'true' });
      setToken(data.token);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  }

  const subCategories = IT_CATEGORIES[form.category] || [];

  return (
    <div className="min-h-screen hero-bg">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-white mb-1">Raise IT Complaint</h1>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Category</label>
                <select
                  required value={form.category}
                  onChange={e => update('category', e.target.value)}
                  className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition text-sm"
                >
                  <option value="" disabled className="bg-[#1e1e2e]">Select category</option>
                  {Object.keys(IT_CATEGORIES).map(c => <option key={c} value={c} className="bg-[#1e1e2e]">{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Sub-category</label>
                <select
                  required value={form.sub_category} disabled={!form.category}
                  onChange={e => update('sub_category', e.target.value)}
                  className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition text-sm disabled:opacity-40"
                >
                  <option value="" disabled className="bg-[#1e1e2e]">Select sub-category</option>
                  {subCategories.map(s => <option key={s} value={s} className="bg-[#1e1e2e]">{s}</option>)}
                </select>
              </div>
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

            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Approval Taken (from founder/manager)</label>
              <div className="mt-2 flex gap-6">
                <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                  <input type="radio" name="approval" value="true" checked={form.approval === 'true'}
                    onChange={e => update('approval', e.target.value)} className="accent-brand-500" />
                  Yes
                </label>
                <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                  <input type="radio" name="approval" value="false" checked={form.approval === 'false'}
                    onChange={e => update('approval', e.target.value)} className="accent-brand-500" />
                  No
                </label>
              </div>
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
