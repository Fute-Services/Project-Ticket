/**
 * Ticket helpers — formatting and counting only, no JSX, so the dashboard
 * component stays about layout.
 *
 * Colour tokens come from docs/brand-guidelines.md (Status / Priority tables).
 * Never return a hex from here; the CSS variables are the source of truth.
 */

// Must match validStatuses in backend/controllers/{hr,it}Controller.js exactly —
// the PATCH endpoint 400s on anything else.
export const STATUSES = ['Pending', 'In Progress', 'Completed'];

const STATUS_TOKENS = {
  Pending: 'var(--warn)',
  'In Progress': 'var(--info)',
  Completed: 'var(--ok)',
};

export function statusToken(status) {
  return STATUS_TOKENS[status] || 'var(--mut)';
}

/**
 * Priority runs primary → secondary → muted, so it steps down in weight
 * without borrowing any of the status colours.
 */
export function priorityToken(priority) {
  const p = String(priority || '').toLowerCase();
  if (p.startsWith('p1') || p.includes('high')) return 'var(--acc)';
  if (p.startsWith('p2') || p.includes('medium')) return 'var(--sec)';
  return 'var(--mut)';
}

// [divisor to reach the next unit, name of that next unit]. The value starts in
// seconds, so the first step promotes seconds → minutes.
const RELATIVE_STEPS = [
  [60, 'minute'],
  [60, 'hour'],
  [24, 'day'],
  [7, 'week'],
  [4.345, 'month'],
  [12, 'year'],
];

/**
 * "2 minutes ago". The exact timestamp belongs in a tooltip, never the cell —
 * a raw ISO string is not something anyone reads.
 */
export function relativeTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';

  let value = (Date.now() - then) / 1000;
  if (value < 45) return 'just now';

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  let unit = 'second';
  for (const [size, nextUnit] of RELATIVE_STEPS) {
    if (Math.abs(value) < size) break;
    value /= size;
    unit = nextUnit;
  }
  return rtf.format(-Math.round(value), unit);
}

/** The exact value, for the `title` tooltip on a relative timestamp. */
export function exactTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

export function countByStatus(tickets) {
  const counts = { total: tickets.length };
  for (const status of STATUSES) counts[status] = 0;
  for (const t of tickets) {
    if (t.status in counts) counts[t.status] += 1;
  }
  return counts;
}

/**
 * Mirrors sortByRecent in the backend controllers. Needed on the client only
 * for the employee view, which merges two separate /my responses.
 */
export function mergeByRecent(...lists) {
  return lists
    .flat()
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
}

/** Tag rows from a single-department endpoint so they match the founder shape. */
export function tagDept(rows, dept_tag) {
  return rows.map((r) => ({ ...r, dept_tag }));
}
