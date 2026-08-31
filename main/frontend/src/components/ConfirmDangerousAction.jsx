import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Field, inputClass } from './ui';
import { verifyPassword } from '../utils/api';

// Reusable high-risk confirm dialog: a typed reason (always required, saved
// into the audit log entry) and, for the riskiest actions, the acting
// Super Admin's own password re-entered and verified server-side - real
// re-authentication (POST /api/auth/verify-password), not a fake prompt.
// `onConfirm(reason)` does the actual destructive call; this component only
// handles the gate in front of it.
export default function ConfirmDangerousAction({ open, onClose, title, description, requirePassword = true, onConfirm }) {
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setReason('');
    setPassword('');
    setError('');
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose?.();
  }

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('A reason is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (requirePassword) {
        const { data } = await verifyPassword(password);
        if (!data.valid) {
          setError('Incorrect password.');
          setSubmitting(false);
          return;
        }
      }
      await onConfirm(reason.trim());
      reset();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not complete this action.');
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={title} description={description}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>This action is destructive and will be recorded in the audit log.</span>
        </div>

        <Field label="Reason" error={!reason.trim() && error === 'A reason is required.' ? error : undefined}>
          <textarea
            className={`${inputClass} min-h-[72px] resize-none`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you doing this?"
            autoFocus
          />
        </Field>

        {requirePassword && (
          <Field label="Confirm your password">
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </Field>
        )}

        {error && error !== 'A reason is required.' && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive hover:bg-destructive/90 disabled:opacity-60 text-destructive-foreground transition-colors cursor-pointer"
          >
            {submitting ? 'Working…' : 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
