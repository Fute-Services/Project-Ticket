import { useState } from 'react';
import { X, CalendarDays, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useEscapeToClose, backdropProps } from '../hooks/useOverlayDismiss';

const LEAVE_TYPES = ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Unpaid Leave'];

function daysBetween(from, to) {
  if (!from || !to) return 0;
  const ms = new Date(to) - new Date(from);
  return ms >= 0 ? Math.round(ms / 86400000) + 1 : 0;
}

export default function NewLeaveModal({ isOpen, onClose, onSubmitSuccess }) {
  const [type, setType] = useState(LEAVE_TYPES[0]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEscapeToClose(isOpen && !submitted && !submitting, onClose);

  if (!isOpen) return null;

  const days = daysBetween(from, to);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!onSubmitSuccess) return;
    setError('');
    setSubmitting(true);
    try {
      await onSubmitSuccess({ type, from, to, days, reason });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFrom('');
        setTo('');
        setReason('');
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not submit the leave request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fadeIn font-sans"
      {...(submitted ? {} : backdropProps(onClose))}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Apply for Leave"
        className="bg-card border border-border rounded-lg w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <CalendarDays size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground leading-none">Apply for Leave</h3>
              <p className="text-xs text-muted-foreground mt-1">Submit a leave request for approval</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {submitted ? (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <CheckCircle2 size={48} className="text-primary mb-3 animate-bounce" />
            <h4 className="text-lg font-bold text-foreground mb-1">Leave Request Submitted!</h4>
            <p className="text-xs text-muted-foreground">HR/Founder will review it shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Leave Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">From</label>
                <input
                  type="date"
                  required
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">To</label>
                <input
                  type="date"
                  required
                  min={from || undefined}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            {days > 0 && (
              <p className="text-xs text-muted-foreground -mt-1">{days} day{days === 1 ? '' : 's'} total</p>
            )}

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Reason</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe the reason for leave..."
                className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs px-3.5 py-2.5 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-muted hover:bg-accent text-xs font-semibold text-muted-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || days <= 0}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-xs font-bold text-primary-foreground flex items-center gap-2 shadow transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{submitting ? 'Submitting…' : 'Submit Request'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
