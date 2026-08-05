// Human-readable time helpers. People read "2 minutes ago", not an ISO string.

const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

function plural(n, unit) {
  return `${n} ${unit}${n > 1 ? 's' : ''}`;
}

// Elapsed time as a bare span, e.g. "3 hours"
export function calcDuration(dateStr) {
  if (!dateStr) return '—';
  const ms = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(ms)) return '—';
  if (ms < MINUTE) return 'Just now';
  if (ms < HOUR) return plural(Math.floor(ms / MINUTE), 'minute');
  if (ms < DAY) return plural(Math.floor(ms / HOUR), 'hour');
  if (ms < WEEK) return plural(Math.floor(ms / DAY), 'day');
  return plural(Math.floor(ms / WEEK), 'week');
}

// Elapsed time as a phrase, e.g. "3 hours ago"
export function timeAgo(dateStr) {
  const d = calcDuration(dateStr);
  return d === 'Just now' || d === '—' ? d : `${d} ago`;
}

// Absolute date for tooltips, e.g. "5 Aug 2026, 2:31 pm"
export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

// Today as YYYY-MM-DD, for date inputs that default to "now"
export function today() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "Good Morning" / "Good Afternoon" / "Good Evening" for the dashboard greeting
export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
