import { PRIORITY_BY_VALUE } from '../utils/constants';

// Priority pill. Shows the plain-language name, with the promised response
// time on hover — "P1" on its own tells a reader nothing.
export default function PriorityBadge({ priority }) {
  const p = PRIORITY_BY_VALUE[priority];
  if (!p) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-white/10 text-white/50 border-white/10">
        {priority}
      </span>
    );
  }

  return (
    <span
      className={`relative group inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border cursor-default ${p.badge}`}
    >
      <span aria-hidden>{p.dot}</span> {p.name}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] text-center px-2.5 py-1.5 rounded-lg bg-[#1e1e2e] border border-white/10 text-white/80 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
        {p.summary} · {p.sla}
      </span>
    </span>
  );
}
