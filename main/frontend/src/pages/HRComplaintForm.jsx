import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AppShell from '../components/AppShell';
import TokenDisplay from '../components/TokenDisplay';
import PrioritySelect from '../components/PrioritySelect';
import RaisingAs from '../components/RaisingAs';
import { useAuth } from '../context/AuthContext';
import { submitHRComplaint } from '../utils/api';
import { today } from '../utils/duration';

export default function HRComplaintForm() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    description: '',
    complaint_date: today(),
    priority: 'P2',
    department: user?.department || '',
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
    } catch {
      toast.error('We could not submit your ticket. Please try again in a few moments.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell width="max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-1">Raise HR Ticket</h1>
        <p className="text-sm text-white/40 mb-6">
          Tell us what happened. You’ll get a tracking token as soon as you submit.
        </p>

        <form onSubmit={handleSubmit} className="surface elev-2 rounded-3xl p-6 flex flex-col gap-5">
          {/* Identity comes from the signed-in account — no retyping */}
          <RaisingAs
            department={form.department}
            onDepartmentChange={v => update('department', v)}
          />

          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              What’s the issue?
            </label>
            <textarea
              required rows={4} value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="Describe what happened, and what you’d like resolved"
              className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-brand-500 transition text-sm resize-none"
            />
          </div>

          <PrioritySelect value={form.priority} onChange={v => update('priority', v)} />

          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              When did it happen?
            </label>
            <input
              type="date" required value={form.complaint_date}
              max={today()}
              onChange={e => update('complaint_date', e.target.value)}
              className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition text-sm [color-scheme:dark]"
            />
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
