import { useState } from 'react';
import { toast } from 'sonner';
import { Modal, Field, inputClass } from './ui';
import { extraHoursApi } from '../utils/api';
import { DateField } from './ui/date-field';
import { TimeField } from './ui/time-field';

const EMPTY = { projectCode: '', fromTime: '', toTime: '', date: new Date().toISOString().slice(0, 10), teammates: '' };

// From/to time, hh:mm each - handles a shift that crosses midnight (toTime
// earlier than fromTime) by treating it as landing the next day, rather than
// going negative. The empty-field check above means both times are always
// filled by the time minutes is computed - a from===to match here is a
// deliberate same-time selection, not an unset field, and can only sensibly
// mean a full 24h shift (the same wraparound this function already applies
// for a smaller-but-not-equal toTime), not a 0-hour entry.
function hoursBetween(fromTime, toTime) {
  if (!fromTime || !toTime) return 0;
  const [fh, fm] = fromTime.split(':').map(Number);
  const [th, tm] = toTime.split(':').map(Number);
  let minutes = (th * 60 + tm) - (fh * 60 + fm);
  if (minutes <= 0) minutes += 24 * 60;
  return Math.round((minutes / 60) * 100) / 100;
}

// Extra Hours Logging - self-service submit, approved through the same
// Payel→Soma (HR→Founder) chain as Document Template uploads (see
// submitExtraHours in hrDeskController.js). Not a live timer like
// CheckInWidget - this is a one-off log entry for hours already worked.
export default function ExtraHoursModal({ open, onClose, onSubmitted }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const hours = hoursBetween(form.fromTime, form.toTime);

  async function submit(e) {
    e.preventDefault();
    if (hours <= 0) {
      toast.error('From and To time must be different');
      return;
    }
    setSaving(true);
    try {
      const { data } = await extraHoursApi.submit({
        projectCode: form.projectCode,
        hours,
        date: form.date,
        fromTime: form.fromTime,
        toTime: form.toTime,
        teammates: form.teammates.split(',').map((t) => t.trim()).filter(Boolean),
      });
      toast.success('Extra hours submitted', { description: 'Sent for sign-off - HR will review it.' });
      setForm(EMPTY);
      onSubmitted?.(data);
      onClose();
    } catch (err) {
      toast.error('Could not submit extra hours', { description: err.response?.data?.error || err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Extra Hours">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Project Code">
          <input required value={form.projectCode} onChange={(e) => setForm((f) => ({ ...f, projectCode: e.target.value }))} className={inputClass} placeholder="e.g. FT-2201" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <TimeField label="From" value={form.fromTime} onChange={(v) => setForm((f) => ({ ...f, fromTime: v }))} />
          <TimeField label="To" value={form.toTime} onChange={(v) => setForm((f) => ({ ...f, toTime: v }))} />
        </div>
        <div className="text-xs text-muted-foreground -mt-1">
          Total: <span className="font-semibold text-foreground">{hours > 0 ? `${hours}h` : '—'}</span>
        </div>
        <DateField label="Date" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
        <Field label="Any other teammates along with me" hint="Comma-separated names">
          <input value={form.teammates} onChange={(e) => setForm((f) => ({ ...f, teammates: e.target.value }))} className={inputClass} placeholder="e.g. Rohit, Priya" />
        </Field>
        <button
          type="submit"
          disabled={saving}
          className="mt-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Submitting…' : 'Submit for sign-off'}
        </button>
      </form>
    </Modal>
  );
}
