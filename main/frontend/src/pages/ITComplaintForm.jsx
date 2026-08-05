import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AppShell from '../components/AppShell';
import TokenDisplay from '../components/TokenDisplay';
import PrioritySelect from '../components/PrioritySelect';
import RaisingAs from '../components/RaisingAs';
import { useAuth } from '../context/AuthContext';
import { submitITComplaint } from '../utils/api';
import { IT_CATEGORIES } from '../utils/constants';
import { today } from '../utils/duration';

export default function ITComplaintForm() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    category: '', sub_category: '',
    description: '',
    complaint_date: today(),
    priority: 'P2',
    approval: 'false',
    department: user?.department || '',
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
    } catch {
      toast.error('We could not submit your ticket. Please try again in a few moments.');
    } finally {
      setLoading(false);
    }
  }

  const subCategories = IT_CATEGORIES[form.category] || [];

  return (
    <AppShell width="max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-1">Raise IT Ticket</h1>
        <p className="text-sm text-white/40 mb-6">
          Tell us what’s broken. You’ll get a tracking token as soon as you submit.
        </p>

        <form onSubmit={handleSubmit} className="surface elev-2 rounded-3xl p-6 flex flex-col gap-5">
          {/* Identity comes from the signed-in account — no retyping */}
          <RaisingAs
            department={form.department}
            onDepartmentChange={v => update('department', v)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">What’s affected?</label>
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
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">More specifically</label>
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
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">What’s the issue?</label>
            <textarea
              required rows={4} value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="Describe what happened, and what you’d like resolved"
              className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-brand-500 transition text-sm resize-none"
            />
          </div>

          <PrioritySelect value={form.priority} onChange={v => update('priority', v)} />

          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">When did it happen?</label>
            <input
              type="date" required value={form.complaint_date}
              max={today()}
              onChange={e => update('complaint_date', e.target.value)}
              className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition text-sm [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Already approved by your manager?
            </label>
            <div className="mt-2 flex gap-6">
              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                <input type="radio" name="approval" value="true" checked={form.approval === 'true'}
                  onChange={e => update('approval', e.target.value)} className="accent-brand-500" />
                Yes
              </label>
              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                <input type="radio" name="approval" value="false" checked={form.approval === 'false'}
                  onChange={e => update('approval', e.target.value)} className="accent-brand-500" />
                Not yet
              </label>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="mt-1 w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold transition btn-glow disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>
      </motion.div>

      {token && (
        <TokenDisplay token={token} onClose={() => navigate('/employee/dashboard')} />
      )}
    </AppShell>
  );
}
