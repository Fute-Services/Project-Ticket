import { STATUS_META } from '../utils/constants';

// Colored pill showing complaint status — colour and dot make it readable at a glance
export default function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  const cls = meta?.badge || 'bg-white/10 text-white/50 border-white/10';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {meta && <span aria-hidden>{meta.dot}</span>}
      {status}
    </span>
  );
}
