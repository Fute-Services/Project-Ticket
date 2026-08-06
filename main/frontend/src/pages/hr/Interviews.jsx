import { useMemo, useState } from 'react';
import { CalendarDays, List, Plus, Video, MapPin } from 'lucide-react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Badge, Pill, Modal, Field, inputClass, EmptyState } from '../../components/ui';
import { interviews as SEED, INTERVIEW_TYPES, INTERVIEW_STATUSES, candidates } from '../../data/hrMockData';

const EMPTY_FORM = { candidate: '', type: 'HR', interviewer: '', date: '', time: '', link: '', location: '', notes: '' };

export default function Interviews() {
  const [interviews, setInterviews] = useState(SEED);
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
  }

  function submitSchedule(e) {
    e.preventDefault();
    const id = `IV-${500 + interviews.length + 1}`;
    setInterviews((rows) => [{ id, status: 'Scheduled', ...form }, ...rows]);
    setForm(EMPTY_FORM);
    setShowSchedule(false);
  }

  return (
    <HrLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <SectionHeader
          title="Interview Management"
          subtitle={`${interviews.filter((i) => i.status === 'Scheduled').length} scheduled`}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView((v) => (v === 'list' ? 'timeline' : 'list'))}
                className="flex items-center gap-2 bg-[#18181c] hover:bg-[#222228] border border-white/10 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                {view === 'list' ? <CalendarDays size={14} /> : <List size={14} />}
                {view === 'list' ? 'Timeline View' : 'List View'}
              </button>
              <button
                type="button"
                onClick={() => setShowSchedule(true)}
                className="flex items-center gap-2 bg-[#e86024] hover:bg-[#d4521a] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
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
                  <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Candidate</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Interviewer</th>
                    <th className="py-3 px-3">When</th>
                    <th className="py-3 px-3">Where</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((i) => (
                    <tr key={i.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-3 font-bold text-white">{i.candidate}</td>
                      <td className="py-3.5 px-3 text-gray-300">{i.type}</td>
                      <td className="py-3.5 px-3 text-gray-300">{i.interviewer}</td>
                      <td className="py-3.5 px-3 text-gray-400">{i.date} · {i.time}</td>
                      <td className="py-3.5 px-3 text-gray-400">
                        <span className="flex items-center gap-1.5">
                          {i.link ? <Video size={12} className="text-[#e86024]" /> : <MapPin size={12} className="text-[#e86024]" />}
                          {i.link || i.location || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <select
                          value={i.status}
                          onChange={(e) => changeStatus(i.id, e.target.value)}
                          className="bg-[#18181c] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#e86024] cursor-pointer"
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
                  <div className="text-xs font-bold text-[#e86024] mb-3">{date}</div>
                  <div className="flex flex-col gap-2 pl-4 border-l-2 border-white/10">
                    {items.map((i) => (
                      <div key={i.id} className="p-3 rounded-xl bg-[#18181c] border border-white/5 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">{i.candidate} — {i.type}</div>
                          <div className="text-[10px] text-gray-500">{i.time} · {i.interviewer}</div>
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
              value={form.candidate}
              onChange={(e) => setForm((f) => ({ ...f, candidate: e.target.value }))}
              className={inputClass}
            >
              <option value="">Select candidate</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
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
          <button type="submit" className="mt-2 bg-[#e86024] hover:bg-[#d4521a] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer">
            Schedule
          </button>
        </form>
      </Modal>
    </HrLayout>
  );
}
