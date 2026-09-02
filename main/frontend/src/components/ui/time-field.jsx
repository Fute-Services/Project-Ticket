import { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55

function pad2(n) {
  return String(n).padStart(2, '0');
}

// value is 24h "HH:MM" (matches native <input type="time">'s own format, so
// callers/backends that already expect that string don't need to change).
function to12h(value) {
  if (!value) return { hour: 9, minute: 0, period: 'AM' };
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return { hour, minute: m, period };
}

function to24hString(hour, minute, period) {
  let h = hour % 12;
  if (period === 'PM') h += 12;
  return `${pad2(h)}:${pad2(minute)}`;
}

function formatDisplay(value) {
  if (!value) return 'Select time';
  const { hour, minute, period } = to12h(value);
  return `${hour}:${pad2(minute)} ${period}`;
}

// Same trigger/popup language as DateField (./date-field.jsx) - a styled
// stand-in for the browser's own <input type="time"> scroll-wheel picker,
// which (like <input type="date">) renders with the OS's own look rather
// than the app's.
export function TimeField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const { hour, minute, period } = to12h(value);

  function set(patch) {
    const next = { hour, minute, period, ...patch };
    onChange(to24hString(next.hour, next.minute, next.period));
  }

  return (
    <div className="flex flex-col gap-1 relative">
      {label && <label className="text-[11px] font-medium text-muted-foreground">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring flex items-center justify-between gap-2 cursor-pointer hover:border-muted-foreground/40 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Clock size={13} className="text-primary shrink-0" />
          <span className="truncate">{formatDisplay(value)}</span>
        </span>
        <ChevronDown size={11} className="text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-muted border border-border rounded-xl shadow-xl z-30 flex gap-1">
          <div className="w-14 max-h-40 overflow-y-auto flex flex-col gap-0.5">
            {HOURS_12.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => set({ hour: h })}
                className={`text-xs py-1.5 rounded-lg text-center cursor-pointer transition-colors ${
                  h === hour ? 'bg-[#0d1811] text-white font-bold' : 'text-foreground hover:bg-accent'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
          <div className="w-14 max-h-40 overflow-y-auto flex flex-col gap-0.5">
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set({ minute: m })}
                className={`text-xs py-1.5 rounded-lg text-center cursor-pointer transition-colors ${
                  m === minute ? 'bg-[#0d1811] text-white font-bold' : 'text-foreground hover:bg-accent'
                }`}
              >
                {pad2(m)}
              </button>
            ))}
          </div>
          <div className="w-12 flex flex-col gap-0.5 self-start">
            {['AM', 'PM'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set({ period: p })}
                className={`text-xs py-1.5 rounded-lg text-center cursor-pointer transition-colors ${
                  p === period ? 'bg-[#0d1811] text-white font-bold' : 'text-foreground hover:bg-accent'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-1 text-[10px] text-primary hover:underline cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
