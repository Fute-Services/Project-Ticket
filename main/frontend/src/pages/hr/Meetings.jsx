import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Pill, Modal, Field, inputClass, EmptyState } from '../../components/ui';
import { meetings as SEED } from '../../data/hrMockData';

const TYPES = ['All', 'HR Meeting', 'Candidate Meeting', 'Team Meeting'];
const EMPTY_FORM = { title: '', type: 'HR Meeting', agenda: '', participants: '', date: '', time: '', notes: '' };

export default function Meetings() {
  const [meetings, setMeetings] = useState(SEED);
  const [typeFilter, setTypeFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = typeFilter === 'All' ? meetings : meetings.filter((m) => m.type === typeFilter);

  function submit(e) {
    e.preventDefault();
    const id = `MT-${200 + meetings.length + 1}`;
    setMeetings((rows) => [
      { id, ...form, participants: form.participants.split(',').map((p) => p.trim()).filter(Boolean) },
      ...rows,
    ]);
    setForm(EMPTY_FORM);
    setShowModal(false);
  }

  return (
    <HrLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <SectionHeader
          title="Meeting Management"
          subtitle={`${meetings.length} meetings scheduled`}
          action={
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#e86024] hover:bg-[#d4521a] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Schedule Meeting
            </button>
          }
        />

        <Card>
          <div className="flex flex-wrap gap-2 mb-5">
            {TYPES.map((t) => (
              <Pill key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>{t}</Pill>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState text="No meetings match this filter." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((m) => (
                <div key={m.id} className="p-4 rounded-2xl bg-[#18181c] border border-white/5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-bold text-white">{m.title}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{m.type} · {m.date} · {m.time}</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{m.agenda}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1">
                    <Users size={12} className="text-[#e86024]" />
                    {m.participants.join(', ')}
                  </div>
                  {m.notes && <div className="text-[10px] text-gray-500 mt-2 pt-2 border-t border-white/5">{m.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Schedule Meeting">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Title">
            <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Type">
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inputClass}>
              {TYPES.slice(1).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Agenda">
            <textarea required value={form.agenda} onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))} className={inputClass} rows={2} />
          </Field>
          <Field label="Participants (comma separated)">
            <input required value={form.participants} onChange={(e) => setForm((f) => ({ ...f, participants: e.target.value }))} className={inputClass} placeholder="Payal Shah, Founder" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input required type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Time">
              <input required type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputClass} rows={2} />
          </Field>
          <button type="submit" className="mt-2 bg-[#e86024] hover:bg-[#d4521a] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer">
            Schedule
          </button>
        </form>
      </Modal>
    </HrLayout>
  );
}
