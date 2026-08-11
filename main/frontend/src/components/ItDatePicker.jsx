import { useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDateStr(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function MiniCalendar({ selectedDate, onSelect }) {
  const initial = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
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
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(dateStr)}
              className={`w-7 h-7 rounded-lg text-[11px] flex items-center justify-center cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : isToday
                  ? 'border border-primary/50 text-foreground hover:bg-accent'
                  : 'text-foreground hover:bg-accent'
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
  const [selectedDate, setSelectedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        weekday: 'short',
      })
    : 'Select date';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDatePicker((p) => !p)}
        className="h-9 flex items-center gap-2 px-3 rounded-xl bg-muted backdrop-blur-md border border-border hover:bg-accent hover:border-muted-foreground/40 text-xs text-muted-foreground font-medium shrink-0 cursor-pointer transition-colors"
      >
        <Calendar size={13} className="text-primary" />
        <span>{selectedDateLabel}</span>
        <ChevronDown size={11} className="text-muted-foreground" />
      </button>
      {showDatePicker && (
        <div className="absolute top-full right-0 mt-2 p-3 bg-muted border border-border rounded-xl shadow-xl z-30">
          <MiniCalendar
            selectedDate={selectedDate}
            onSelect={(dateStr) => {
              setSelectedDate(dateStr);
              setShowDatePicker(false);
            }}
          />
          {selectedDate && (
            <button
              type="button"
              onClick={() => {
                setSelectedDate('');
                setShowDatePicker(false);
              }}
              className="mt-2 w-full text-[11px] text-muted-foreground hover:text-foreground text-center cursor-pointer"
            >
              Clear date
            </button>
          )}
        </div>
      )}
    </div>
  );
}
