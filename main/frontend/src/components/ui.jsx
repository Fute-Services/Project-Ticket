// Shared visual primitives for both dashboards (HR and the IT/founder/
// employee desk) — one card/stat/badge vocabulary so the two areas of the
// app read as the same product instead of drifting independently.

const STATUS_COLORS = {
  // Candidate stages
  Applied: 'bg-white/5 text-gray-300 border-white/10',
  Screening: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  'HR Round': 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  'Technical Round': 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  'Final Interview': 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  'Offer Sent': 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  Joined: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Rejected: 'bg-red-500/10 text-red-300 border-red-500/20',
  // Interview / meeting statuses
  Scheduled: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  Completed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  Cancelled: 'bg-red-500/10 text-red-300 border-red-500/20',
  Rescheduled: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  // Attendance
  Present: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  Absent: 'bg-red-500/10 text-red-300 border-red-500/20',
  Late: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  'Half Day': 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  'Work From Home': 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  // Leave / task
  Pending: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  Approved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  'In Progress': 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  // Priority
  Low: 'bg-white/5 text-gray-300 border-white/10',
  Medium: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  High: 'bg-red-500/10 text-red-300 border-red-500/20',
  // Employee status
  Active: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  'On Leave': 'bg-amber-500/10 text-amber-300 border-amber-500/20',
};

export function Badge({ value, className = '' }) {
  const tone = STATUS_COLORS[value] || 'bg-white/5 text-gray-300 border-white/10';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border whitespace-nowrap ${tone} ${className}`}>
      {value}
    </span>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-[#141418] border border-white/5 rounded-3xl p-5 ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h2 className="text-lg font-extrabold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// Small trend line used inside StatCard when `change` is passed.
export function MiniSparkline({ color = '#e86024' }) {
  return (
    <svg className="w-14 h-7 overflow-visible shrink-0" viewBox="0 0 60 30" fill="none">
      <path
        d="M2 22 Q 15 18, 25 24 T 45 10 T 58 4"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M2 22 Q 15 18, 25 24 T 45 10 T 58 4 L 58 30 L 2 30 Z"
        fill={`url(#sparkline-grad-${color.replace('#', '')})`}
        opacity="0.2"
      />
      <defs>
        <linearGradient id={`sparkline-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// The one StatCard used everywhere. `sub` is a plain caption line; pass
// `change` instead when the card also wants a trend sparkline (dashboard
// home views) — the two are mutually exclusive so cards never show both.
// `icon` + `accent` are optional — when passed, a small colored icon badge
// renders above the value using `accent` as its tint.
export function StatCard({ label, value, sub, change, icon: Icon, accent }) {
  return (
    <div className="bg-[#141418] border border-white/10 rounded-xl p-3 flex flex-col justify-between min-h-[70px] hover:border-white/20 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold text-gray-400 truncate tracking-wide leading-tight">
          {label}
        </div>
        {Icon && (
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${accent || '#e86024'}1a`, color: accent || '#e86024' }}
          >
            <Icon size={13} />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mt-1.5 min-w-0">
        <span
          className="text-2xl font-black text-white tracking-tight leading-none shrink-0"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </span>
        {sub && (
          <span className="text-[10px] text-gray-500 font-medium truncate leading-none">
            {sub}
          </span>
        )}
        {change && (
          <span className="text-[10px] text-emerald-400 font-bold leading-none ml-auto shrink-0">
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ text = 'Nothing here yet.' }) {
  return <p className="text-xs text-gray-500 py-8 text-center">{text}</p>;
}

export function IconButton({ icon: Icon, onClick, active, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
        active
          ? 'bg-[#e86024]/15 border-[#e86024]/40 text-[#e86024]'
          : 'bg-[#16161a] border-white/10 text-gray-300 hover:border-white/20'
      }`}
    >
      <Icon size={16} />
    </button>
  );
}

export function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
        active
          ? 'bg-[#e86024] text-white'
          : 'bg-[#18181c] border border-white/10 text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// Right-side slide-over used for candidate profiles, meeting/task details, etc.
export function Drawer({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative h-full ${wide ? 'w-full sm:w-[520px]' : 'w-full sm:w-[420px]'} bg-[#131316] border-l border-white/10 overflow-y-auto`}
      >
        <div className="sticky top-0 bg-[#131316]/95 backdrop-blur border-b border-white/5 px-5 py-4 flex items-center justify-between z-10">
          <h3 className="font-bold text-white text-sm">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none cursor-pointer px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#141418] border border-white/10 rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-base">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none cursor-pointer px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs">
      <span className="text-gray-400 font-medium">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full bg-[#18181c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e86024] transition-colors';

export function Stars({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={`text-lg leading-none cursor-pointer ${n <= value ? 'text-amber-400' : 'text-gray-700'} ${onChange ? '' : 'cursor-default'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
