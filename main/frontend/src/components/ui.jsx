// Shared visual primitives used across all five dashboards.
//
// These keep their original call signatures so existing screens don't have to
// change, but the overlays now delegate to Radix (via src/components/ui/*),
// which brings focus trapping, Esc-to-close, scroll locking and proper
// dialog roles that the hand-rolled versions never had.
//
// For new UI prefer the shadcn primitives directly - `@/components/ui/button`,
// `@/components/ui/input`, and so on.

import { cloneElement, isValidElement, useId } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { Label } from './ui/label';
import { Input as ShadInput } from './ui/input';
import { Button } from './ui/button';
import { tint } from '../styles/seriesColors';
import { RefreshCw } from 'lucide-react';
import { relativeTime } from '../utils/tickets';

// Status vocabulary. Each tone carries an explicit light and dark text
// colour: the 300-weight text these used to rely on is legible on a dark
// surface but washes out badly on white, so the light value is the darker
// 700 and `dark:` restores the original.
const STATUS_COLORS = {
  // Candidate stages
  Applied: 'bg-muted text-muted-foreground border-border',
  Screening: 'bg-muted/10 text-muted-foreground dark:text-muted-foreground border-muted/20',
  'HR Round': 'bg-warning/10 text-warning dark:text-warning border-warning/20',
  'Technical Round': 'bg-muted/10 text-muted-foreground dark:text-muted-foreground border-muted/20',
  'Final Interview': 'bg-primary/10 text-primary border-primary/20',
  'Offer Sent': 'bg-primary/10 text-primary dark:text-primary border-primary/20',
  Joined: 'bg-primary/15 text-primary dark:text-primary border-primary/30',
  'Offer Declined': 'bg-destructive/10 text-destructive dark:text-destructive border-destructive/20',
  Rejected: 'bg-destructive/10 text-destructive dark:text-destructive border-destructive/20',
  'On Hold': 'bg-warning/10 text-warning dark:text-warning border-warning/20',
  // Interview / meeting statuses
  Scheduled: 'bg-muted/10 text-muted-foreground dark:text-muted-foreground border-muted/20',
  Completed: 'bg-primary/10 text-primary dark:text-primary border-primary/20',
  Cancelled: 'bg-destructive/10 text-destructive dark:text-destructive border-destructive/20',
  Rescheduled: 'bg-warning/10 text-warning dark:text-warning border-warning/20',
  // Attendance
  Present: 'bg-primary/10 text-primary dark:text-primary border-primary/20',
  Absent: 'bg-destructive/10 text-destructive dark:text-destructive border-destructive/20',
  Late: 'bg-warning/10 text-warning dark:text-warning border-warning/20',
  'Half Day': 'bg-muted/10 text-muted-foreground dark:text-muted-foreground border-muted/20',
  'Work From Home': 'bg-muted/10 text-muted-foreground dark:text-muted-foreground border-muted/20',
  // Leave / task
  Pending: 'bg-warning/10 text-warning dark:text-warning border-warning/20',
  Approved: 'bg-primary/10 text-primary dark:text-primary border-primary/20',
  'In Progress': 'bg-muted/10 text-muted-foreground dark:text-muted-foreground border-muted/20',
  // Priority
  Low: 'bg-muted text-muted-foreground border-border',
  Medium: 'bg-warning/10 text-warning dark:text-warning border-warning/20',
  High: 'bg-destructive/10 text-destructive dark:text-destructive border-destructive/20',
  // Employee status
  Active: 'bg-primary/10 text-primary dark:text-primary border-primary/20',
  'On Leave': 'bg-warning/10 text-warning dark:text-warning border-warning/20',
};

export function Badge({ value, className = '' }) {
  const tone = STATUS_COLORS[value] || 'bg-muted text-muted-foreground border-border';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${tone} ${className}`}
    >
      {value}
    </span>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`apple-glass-card border border-white/80 rounded-2xl lg:rounded-3xl p-4 sm:p-5 transition-all ${className}`}>{children}</div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div>
        <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// `sub` is a plain caption line; `change` adds a trend figure. `icon` +
// `accent` render a tinted icon badge - accent defaults to the brand token
// rather than a literal hex so it follows the theme.
export function StatCard({ label, value, sub, change, icon: Icon, accent, progress }) {
  const accentColor = accent || 'hsl(var(--primary))';
  return (
    <div className="apple-glass-card border border-white/80 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-h-[82px] hover:border-primary/40 hover:shadow-lg transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate leading-tight">{label}</div>
        {Icon && (
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: accent ? tint(accent, 0.1) : 'hsl(var(--primary) / 0.1)',
              color: accentColor,
            }}
          >
            <Icon size={13} />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mt-2 min-w-0">
        <span
          className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none shrink-0"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </span>
        {sub && <span className="text-[11px] sm:text-xs text-muted-foreground truncate leading-none">{sub}</span>}
        {change && (
          <span className="text-[11px] text-rose-600 font-semibold leading-none ml-auto shrink-0 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-200/50">{change}</span>
        )}
      </div>
      {typeof progress === 'number' && (
        <div className="w-full bg-muted/60 h-1.5 rounded-full mt-2.5 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Dark highlight widget matching the reference design (top-left card)
export function DarkMetricCard({ label, value, unit = '', change, trend = 'up', bars = [40, 65, 30, 85, 55, 95] }) {
  return (
    <div className="bg-[#140B0D] border border-rose-600/20 rounded-2xl p-4 text-white shadow-lg shadow-black/20 flex items-center justify-between gap-4 min-w-[220px]">
      <div className="min-w-0">
        <div className="text-[11px] text-rose-300/80 font-medium truncate">{label}</div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-white">{value}</span>
          {unit && <span className="text-xs text-rose-500 font-normal">{unit}</span>}
        </div>
        {change && (
          <div className="flex items-center gap-1 mt-1 text-[10px] text-rose-500 font-medium">
            <span>{trend === 'up' ? '↗' : '↘'} {change}</span>
          </div>
        )}
      </div>
      {/* Live animated sparkline bars */}
      <div className="flex items-end gap-1 h-9 shrink-0 px-1">
        {bars.map((h, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-300 ${
              i === bars.length - 1 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244, 63, 94,0.8)]' : 'bg-rose-600/60'
            }`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// An empty state should say what's missing and offer the way out of it, so
// `title`/`action` are supported alongside the original plain `text`.
export function EmptyState({ text = 'Nothing here yet.', title, action }) {
  return (
    <div className="py-10 flex flex-col items-center justify-center text-center gap-2">
      {title && <p className="text-sm font-medium text-foreground">{title}</p>}
      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{text}</p>
      {action}
    </div>
  );
}

// For views that no longer auto-poll (personal "My X" lists - see
// TicketContext/TaskProjectContext/LeaveContext's SHARED_*_ROLES) - makes
// the manual-only refresh an explicit, visible action instead of a page
// that silently never updates itself.
export function RefreshBar({ lastUpdated, loading, onRefresh }) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60 cursor-pointer"
      title="This list only updates when you refresh it"
    >
      <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
      <span>{loading ? 'Refreshing…' : lastUpdated ? `Updated ${relativeTime(lastUpdated)}` : 'Refresh'}</span>
    </button>
  );
}

export function IconButton({ icon: Icon, onClick, active, title, ...rest }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      variant={active ? 'secondary' : 'outline'}
      size="icon"
      className={active ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15' : ''}
      {...rest}
    >
      <Icon size={16} />
    </Button>
  );
}

export function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
        active
          ? 'bg-[#180D0F] text-white shadow-md border border-white/15 font-bold'
          : 'bg-white/50 border border-white/80 text-muted-foreground hover:text-foreground hover:bg-black/5'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Right-side slide-over. Now a Radix Sheet, so it traps focus, closes on Esc,
 * locks background scroll, and is announced as a dialog.
 */
export function Drawer({ open, onClose, title, children, wide = false }) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose?.()}>
      <SheetContent
        side="right"
        className={`overflow-y-auto p-0 ${wide ? 'w-full sm:max-w-[520px]' : 'w-full sm:max-w-[420px]'}`}
      >
        <SheetHeader className="sticky top-0 bg-card/95 backdrop-blur border-b border-border px-5 py-4 z-10 text-left space-y-0">
          <SheetTitle className="text-sm font-semibold">{title}</SheetTitle>
          <SheetDescription className="sr-only">{title}</SheetDescription>
        </SheetHeader>
        <div className="p-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Centred modal. Radix Dialog - same a11y wins as Drawer above.
 * `description` is optional but worth passing: without it screen readers get
 * only the title.
 */
export function Modal({ open, onClose, title, description, children, className }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      {/* Radix warns when content has no description; passing undefined is the
          documented way to say "there deliberately isn't one". */}
      <DialogContent className={className || "max-w-lg max-h-[85vh] overflow-y-auto"}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Most call sites pass a label and a bare `<input>`/`<select>` without an id,
 * which left the control with no accessible name - "Title" and "Due Date" in
 * the Assign Task dialog were both announced as an unlabelled textbox. When no
 * `htmlFor` is supplied we generate one and stamp it onto the single child, so
 * every existing call site gets a real association for free. An explicit
 * `htmlFor`, or an id already on the child, still wins.
 */
export function Field({ label, htmlFor, children, error, hint }) {
  const generatedId = useId();
  const single = isValidElement(children) ? children : null;
  const fieldId = htmlFor || single?.props?.id || (single ? generatedId : undefined);
  const control = single && !htmlFor && !single.props.id ? cloneElement(single, { id: fieldId }) : children;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId} className="text-xs text-muted-foreground font-medium">
        {label}
      </Label>
      {control}
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : (
        hint && <span className="text-xs text-muted-foreground">{hint}</span>
      )}
    </div>
  );
}

// Re-export so screens can use a real component instead of the class string.
export const Input = ShadInput;

/**
 * Kept as a string because ~30 call sites spread it onto native inputs and
 * selects. It mirrors shadcn's Input styling so the two look identical.
 * Prefer `<Input />` in new code.
 */
export const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export function Stars({ value, onChange }) {
  const readOnly = !onChange;
  return (
    <div className="flex items-center gap-1" role={readOnly ? 'img' : 'group'} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          aria-label={`Rate ${n} out of 5`}
          className={`text-lg leading-none rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
            n <= value ? 'text-warning' : 'text-muted-foreground/40'
          } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
