import { useMemo, useState } from 'react';
import { CalendarDays, List, Plus, Video, MapPin } from 'lucide-react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Badge, Pill, Modal, Field, inputClass, EmptyState } from '../../components/ui';
import { INTERVIEW_TYPES, INTERVIEW_STATUSES } from '../../data/hrMockData';
import { interviewsApi } from '../../utils/api';
import { useHrDesk } from '../../context/HrDeskContext';

const EMPTY_FORM = { candidateId: '', candidate: '', type: 'HR', interviewer: '', date: '', time: '', link: '', location: '', notes: '' };

export default function Interviews() {
  const { interviews, setInterviews, candidates } = useHrDesk();
  const [view, setView] = useState('list');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showSchedule, setShowSchedule] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = useMemo(
    () => (statusFilter === 'All' ? interviews : interviews.filter((i) => i.status === statusFilter)),
    [interviews, statusFilter]
  );

  const grouped = useMemo(() => {
    const byDate = {};
    filtered.forEach((i) => {
      byDate[i.date] = byDate[i.date] || [];
      byDate[i.date].push(i);
    });
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  function changeStatus(id, status) {
    setInterviews((rows) => rows.map((i) => (i.id === id ? { ...i, status } : i)));
    interviewsApi.update(id, { status }).catch((e) => console.error('Failed to update interview status:', e.message));
  }

  function submitSchedule(e) {
    e.preventDefault();
    interviewsApi.create({ status: 'Scheduled', ...form }).then(({ data }) => {
      setInterviews((rows) => [data, ...rows]);
    }).catch((err) => console.error('Failed to schedule interview:', err.message));
    setForm(EMPTY_FORM);
    setShowSchedule(false);
  }

  return (
    <HrLayout>
      <div className="flex flex-col gap-6 w-full">
        <SectionHeader
          title="Interview Management"
          subtitle={`${interviews.filter((i) => i.status === 'Scheduled').length} scheduled`}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView((v) => (v === 'list' ? 'timeline' : 'list'))}
                className="flex items-center gap-2 bg-muted hover:bg-accent border border-border text-foreground text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                {view === 'list' ? <CalendarDays size={14} /> : <List size={14} />}
                {view === 'list' ? 'Timeline View' : 'List View'}
              </button>
              <button
                type="button"
                onClick={() => setShowSchedule(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <Plus size={14} />
                Schedule Interview
              </button>
            </div>
          }
        />

        <Card>
          <div className="flex flex-wrap gap-2 mb-5">
            <Pill active={statusFilter === 'All'} onClick={() => setStatusFilter('All')}>All</Pill>
            {INTERVIEW_STATUSES.map((s) => (
              <Pill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{s}</Pill>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState text="No interviews match this filter." />
          ) : view === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase text-xs tracking-wider">
                    <th className="py-3 px-3">Candidate</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Interviewer</th>
                    <th className="py-3 px-3">When</th>
                    <th className="py-3 px-3">Where</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((i) => (
                    <tr key={i.id} className="hover:bg-accent">
                      <td className="py-3.5 px-3 font-bold text-foreground">{i.candidate}</td>
                      <td className="py-3.5 px-3 text-muted-foreground">{i.type}</td>
                      <td className="py-3.5 px-3 text-muted-foreground">{i.interviewer}</td>
                      <td className="py-3.5 px-3 text-muted-foreground">{i.date} · {i.time}</td>
                      <td className="py-3.5 px-3 text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          {i.link ? <Video size={12} className="text-primary" /> : <MapPin size={12} className="text-primary" />}
                          {i.link || i.location || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <select
                          aria-label={`Change status for ${i.candidate} interview`}
                          value={i.status}
                          onChange={(e) => changeStatus(i.id, e.target.value)}
                          className="bg-muted border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                        >
                          {INTERVIEW_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {grouped.map(([date, items]) => (
                <div key={date}>
                  <div className="text-xs font-bold text-primary mb-3">{date}</div>
                  <div className="flex flex-col gap-2 pl-4 border-l-2 border-border">
                    {items.map((i) => (
                      <div key={i.id} className="p-3 rounded-xl bg-muted border border-border flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-foreground">{i.candidate} — {i.type}</div>
                          <div className="text-xs text-muted-foreground">{i.time} · {i.interviewer}</div>
                        </div>
                        <Badge value={i.status} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={showSchedule} onClose={() => setShowSchedule(false)} title="Schedule Interview">
        <form onSubmit={submitSchedule} className="flex flex-col gap-3">
          <Field label="Candidate">
            <select
              required
              value={form.candidateId}
              onChange={(e) => {
                const candidateId = e.target.value;
                const candidate = candidates.find((c) => c.id === candidateId)?.name || '';
                setForm((f) => ({ ...f, candidateId, candidate }));
              }}
              className={inputClass}
            >
              <option value="">Select candidate</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inputClass}>
                {INTERVIEW_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Interviewer">
              <input required value={form.interviewer} onChange={(e) => setForm((f) => ({ ...f, interviewer: e.target.value }))} className={inputClass} placeholder="Name" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input required type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Time">
              <input required type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label="Meeting link (optional)">
            <input value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} className={inputClass} placeholder="meet.fute.com/..." />
          </Field>
          <Field label="Location (optional)">
            <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className={inputClass} placeholder="Conference Room A" />
          </Field>
          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputClass} rows={2} />
          </Field>
          <button type="submit" className="mt-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer">
            Schedule
          </button>
        </form>
      </Modal>
    </HrLayout>
  );
}
