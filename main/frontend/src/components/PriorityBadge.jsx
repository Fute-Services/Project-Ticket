// Shows P1/P2/P3 badge with a hover tooltip explaining what each means
export default function PriorityBadge({ priority }) {
  const map = {
    P1: { label: 'P1', color: 'bg-red-500/15 text-red-400 border-red-500/20', tip: 'P1 — High Priority: Critical issue, needs immediate attention' },
    P2: { label: 'P2', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20', tip: 'P2 — Medium Priority: Important but not urgent' },
    P3: { label: 'P3', color: 'bg-green-500/15 text-green-400 border-green-500/20', tip: 'P3 — Low Priority: Can be addressed when time permits' },
  };
  const p = map[priority] || { label: priority, color: 'bg-white/10 text-white/50 border-white/10', tip: '' };

  return (
    <span
      className={`relative group inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border cursor-default ${p.color}`}
    >
      {p.label}
      {/* Tooltip on hover */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] text-center px-2 py-1 rounded-lg bg-[#1e1e2e] border border-white/10 text-white/80 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
        {p.tip}
      </span>
    </span>
  );
}
