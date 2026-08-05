import { PRIORITIES } from '../utils/constants';

/**
 * Priority picker that explains itself. Nobody should have to guess what "P1"
 * means, so each option states the situation it covers and the response time
 * the requester can expect.
 */
export default function PrioritySelect({ value, onChange }) {
  return (
    <div>
      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
        How urgent is this?
      </label>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PRIORITIES.map(p => {
          const selected = value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              aria-pressed={selected}
              className={`text-left rounded-2xl border p-4 transition ${
                selected
                  ? `${p.ring} elev-3 -translate-y-0.5`
                  : 'border-white/10 bg-white/[0.03] elev-1 hover:bg-white/[0.06] hover:-translate-y-0.5 hover:shadow-elev-2'
              }`}
            >
              <span className={`flex items-center gap-2 font-bold text-sm ${selected ? p.color : 'text-white/80'}`}>
                <span aria-hidden>{p.dot}</span> {p.name}
              </span>
              <p className="text-xs text-white/50 mt-1.5 leading-relaxed">{p.summary}</p>
              <p className="text-[11px] text-white/30 mt-2">{p.sla}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
