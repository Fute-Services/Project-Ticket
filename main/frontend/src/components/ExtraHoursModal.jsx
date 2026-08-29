import { useState } from 'react';
import { toast } from 'sonner';
import { Modal, Field, inputClass } from './ui';
import { extraHoursApi } from '../utils/api';

const EMPTY = { projectCode: '', hours: '', date: new Date().toISOString().slice(0, 10), time: '', teammates: '' };

// Extra Hours Logging — self-service submit, approved through the same
// Payel→Soma (HR→Founder) chain as Document Template uploads (see
// submitExtraHours in hrDeskController.js). Not a live timer like
// CheckInWidget — this is a one-off log entry for hours already worked.
export default function ExtraHoursModal({ open, onClose, onSubmitted }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await extraHoursApi.submit({
        projectCode: form.projectCode,
        hours: Number(form.hours) || 0,
        date: form.date,
        time: form.time,
        teammates: form.teammates.split(',').map((t) => t.trim()).filter(Boolean),
      });
      toast.success('Extra hours submitted', { description: 'Sent for sign-off — HR will review it.' });
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
          <Field label="Hours">
            <input required type="number" min="0" step="0.5" value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} className={inputClass} placeholder="e.g. 2.5" />
          </Field>
          <Field label="Time">
            <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className={inputClass} />
          </Field>
        </div>
        <Field label="Date">
          <input required type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputClass} />
        </Field>
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
