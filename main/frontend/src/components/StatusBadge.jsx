// Colored pill showing complaint status
export default function StatusBadge({ status }) {
  const map = {
    'Pending':     'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    'In Progress': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'Completed':   'bg-green-500/15 text-green-400 border-green-500/20',
  };
  const cls = map[status] || 'bg-white/10 text-white/50 border-white/10';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status}
    </span>
  );
}
