import { useState } from 'react';
import { Plus } from 'lucide-react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Badge, Modal, Field, inputClass, Stars, EmptyState } from '../../components/ui';
import { feedbackEntries as SEED, interviews } from '../../data/hrMockData';

const RECOMMENDATIONS = ['Hire', 'Hold', 'Reject'];
const EMPTY_FORM = { interviewId: '', interviewer: '', rating: 5, recommendation: 'Hire', comments: '' };

const RECOMMENDATION_TONE = {
  Hire: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  Hold: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  Reject: 'bg-red-500/10 text-red-300 border-red-500/20',
};

export default function Feedback() {
  const [entries, setEntries] = useState(SEED);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  function submit(e) {
    e.preventDefault();
    const interview = interviews.find((i) => i.id === form.interviewId);
    const id = `FB-${entries.length + 1}`;
    setEntries((rows) => [
      { id, candidate: interview?.candidate || 'Unknown', interviewId: form.interviewId, interviewer: form.interviewer, rating: form.rating, recommendation: form.recommendation, comments: form.comments },
      ...rows,
    ]);
    setForm(EMPTY_FORM);
    setShowModal(false);
  }

  return (
    <HrLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <SectionHeader
          title="Interview Feedback"
          subtitle={`${entries.length} feedback entries`}
          action={
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#e86024] hover:bg-[#d4521a] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Submit Feedback
            </button>
          }
        />

        <Card>
          {entries.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {entries.map((f) => (
                <div key={f.id} className="p-4 rounded-2xl bg-[#18181c] border border-white/5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-bold text-white">{f.candidate}</div>
                      <div className="text-[10px] text-gray-500">by {f.interviewer}</div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border whitespace-nowrap ${RECOMMENDATION_TONE[f.recommendation]}`}>
                      {f.recommendation}
                    </span>
                  </div>
                  <Stars value={f.rating} />
                  <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">{f.comments}</p>
                  <div className="mt-2.5 text-[10px] font-semibold text-[#e86024]">Recommendation: {f.recommendation}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Submit Interview Feedback">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Interview">
            <select required value={form.interviewId} onChange={(e) => setForm((f) => ({ ...f, interviewId: e.target.value }))} className={inputClass}>
              <option value="">Select interview</option>
              {interviews.map((i) => (
                <option key={i.id} value={i.id}>{i.candidate} — {i.type} ({i.date})</option>
              ))}
            </select>
          </Field>
          <Field label="Interviewer">
            <input required value={form.interviewer} onChange={(e) => setForm((f) => ({ ...f, interviewer: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Rating">
            <Stars value={form.rating} onChange={(n) => setForm((f) => ({ ...f, rating: n }))} />
          </Field>
          <Field label="Recommendation">
            <select value={form.recommendation} onChange={(e) => setForm((f) => ({ ...f, recommendation: e.target.value }))} className={inputClass}>
              {RECOMMENDATIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Comments">
            <textarea required value={form.comments} onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))} className={inputClass} rows={3} />
          </Field>
          <button type="submit" className="mt-2 bg-[#e86024] hover:bg-[#d4521a] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer">
            Submit
          </button>
        </form>
      </Modal>
    </HrLayout>
  );
}
