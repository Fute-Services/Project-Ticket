import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { MiniCalendar } from '../ItDatePicker';

function formatShort(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// A single-date field styled to match the other bg-muted/rounded-xl form
// inputs (Request Title, Department, ...) instead of the browser's native
// <input type="date">, which renders inconsistently across browsers and
// doesn't match the app's own calendar UI used everywhere else.
export function DateField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1 relative">
      {label && <label className="text-[11px] font-medium text-muted-foreground">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring flex items-center justify-between gap-2 cursor-pointer hover:border-muted-foreground/40 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Calendar size={13} className="text-primary shrink-0" />
          <span className="truncate">{value ? formatShort(value) : 'Select date'}</span>
        </span>
        <ChevronDown size={11} className="text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-muted border border-border rounded-xl shadow-xl z-30">
          <MiniCalendar
            start={value}
            end={value}
            onPick={(dateStr) => {
              onChange(dateStr);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
