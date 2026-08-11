import { useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDateStr(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function formatShort(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// `start`/`end` are yyyy-mm-dd strings, `end` may be empty while a range is
// still mid-pick. Highlights the whole span between them, not just the two
// endpoints, so the picker reads as "this date to this date". Exported so a
// single-date field (e.g. DateField.jsx) can reuse it by passing the same
// value for both start and end.
export function MiniCalendar({ start, end, onPick }) {
  const initial = start ? new Date(`${start}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="w-[240px]">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={goPrevMonth}
          aria-label="Previous month"
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground cursor-pointer"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-semibold text-foreground">{monthLabel}</span>
        <button
          type="button"
          onClick={goNextMonth}
          aria-label="Next month"
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground cursor-pointer"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} className="text-[9px] text-center text-muted-foreground font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dateStr = toDateStr(viewYear, viewMonth, d);
          const isStart = dateStr === start;
          const isEnd = dateStr === end;
          const isInRange = start && end && dateStr > start && dateStr < end;
          const isToday = dateStr === todayStr;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(dateStr)}
              className={`w-7 h-7 text-[11px] flex items-center justify-center cursor-pointer transition-colors ${
                isStart || isEnd
                  ? 'bg-primary text-primary-foreground font-semibold rounded-lg'
                  : isInRange
                  ? 'bg-primary/15 text-foreground rounded-none'
                  : isToday
                  ? 'border border-primary/50 text-foreground hover:bg-accent rounded-lg'
                  : 'text-foreground hover:bg-accent rounded-lg'
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Reused in every IT dashboard page's own header row (placed before that
// page's action button, e.g. Assets' "Add Asset") so it sits side-by-side
// with it instead of floating in a separate row that can overlap it.
export default function ItDatePicker() {
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const label = !rangeStart
    ? 'Select date range'
    : !rangeEnd
    ? `${formatShort(rangeStart)} – Select end`
    : `${formatShort(rangeStart)} – ${formatShort(rangeEnd)}`;

  function handlePick(dateStr) {
    // No range yet, or a full range already picked → start a fresh one.
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(dateStr);
      setRangeEnd('');
      return;
    }
    // Mid-pick: second click completes the range, earlier end swaps to start.
    if (dateStr < rangeStart) {
      setRangeEnd(rangeStart);
      setRangeStart(dateStr);
    } else {
      setRangeEnd(dateStr);
    }
    setShowDatePicker(false);
  }

  function clearRange() {
    setRangeStart('');
    setRangeEnd('');
    setShowDatePicker(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDatePicker((p) => !p)}
        className="h-7 flex items-center gap-1.5 px-2.5 rounded-lg bg-muted backdrop-blur-md border border-border hover:bg-accent hover:border-muted-foreground/40 text-[11px] text-muted-foreground font-medium shrink-0 cursor-pointer transition-colors"
      >
        <Calendar size={11} className="text-primary" />
        <span>{label}</span>
        <ChevronDown size={10} className="text-muted-foreground" />
      </button>
      {showDatePicker && (
        <div className="absolute top-full right-0 mt-2 p-3 bg-muted border border-border rounded-xl shadow-xl z-30">
          {rangeStart && !rangeEnd && (
            <p className="text-[11px] text-muted-foreground mb-2 text-center">Now pick the end date</p>
          )}
          <MiniCalendar start={rangeStart} end={rangeEnd} onPick={handlePick} />
          {(rangeStart || rangeEnd) && (
            <button
              type="button"
              onClick={clearRange}
              className="mt-2 w-full text-[11px] text-muted-foreground hover:text-foreground text-center cursor-pointer"
            >
              Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  );
}
