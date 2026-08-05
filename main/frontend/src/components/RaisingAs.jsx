import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS } from '../utils/constants';
import { User } from 'lucide-react';

/**
 * Shows who the ticket is being raised as. The signed-in account already knows
 * the person's name and department, so the form never asks them to retype it.
 * The department picker only appears for older accounts that never stored one.
 */
export default function RaisingAs({ department, onDepartmentChange }) {
  const { user } = useAuth();
  const initials = (user?.full_name || '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Raising as</span>

      <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-3">
        <span className="w-9 h-9 shrink-0 rounded-full bg-brand-500/20 text-brand-500 grid place-items-center text-xs font-bold">
          {initials || <User size={15} />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
          <p className="text-xs text-white/40 truncate">
            {user?.department ? `${user.department} · ` : ''}
            <span className="capitalize">{user?.role}</span>
          </p>
        </div>
      </div>

      {!user?.department && (
        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
            Which department are you in?
          </label>
          <select
            required
            value={department}
            onChange={e => onDepartmentChange(e.target.value)}
            className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition text-sm"
          >
            <option value="" disabled className="bg-[#1e1e2e]">Select department</option>
            {DEPARTMENTS.map(d => <option key={d} value={d} className="bg-[#1e1e2e]">{d}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
