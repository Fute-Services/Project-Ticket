import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, PhoneCall } from 'lucide-react';
import { Badge, Modal, Field, inputClass } from '../ui';
import { salesLeadsApi } from '../../utils/api';
import { useSalesDesk } from '../../context/SalesDeskContext';
import { ColorSelect } from '../TicketsQueueView';

export const STATUS_VALUES = [
  'Yet to be Called', 'Contacted', 'Did Not Pick', 'Invalid', 'Not Interested',
  'Details Shared', 'Requested Call Back', 'Meeting Arranged', 'Proposal', 'Converted', 'Lost',
];
export const PRIORITY_VALUES = ['Hot', 'Warm', 'Cold'];
export const LOST_REASON_VALUES = [
  'Budget Mismatch', 'Wrong Timing', 'Chose a Competitor', 'No Longer Interested',
  'Invalid Lead', 'Unresponsive', 'Other',
];
const SOURCE_SUGGESTIONS = ['Referral', 'Existing Client', 'Outbound', 'Campaign', 'Email', 'Cold List'];

// Pipeline (kanban) stage - derived from `status`, never stored separately,
// so there's one source of truth instead of two fields that can drift.
export const STAGES = ['New leads', 'Contacted', 'Meeting', 'Proposal', 'Closure'];
const STATUS_TO_STAGE = {
  'Yet to be Called': 'New leads', 'Did Not Pick': 'New leads', Invalid: 'New leads',
  Contacted: 'Contacted', 'Not Interested': 'Contacted', 'Details Shared': 'Contacted', 'Requested Call Back': 'Contacted',
  'Meeting Arranged': 'Meeting',
  Proposal: 'Proposal',
  Converted: 'Closure', Lost: 'Closure',
};
export function stageForStatus(status) {
  return STATUS_TO_STAGE[status] || 'New leads';
}
// The one representative status a card moves to when advanced to a stage -
// used by Pipeline's "advance" action, not by anything reading stage back out.
export const STAGE_DEFAULT_STATUS = { 'New leads': 'Yet to be Called', Contacted: 'Contacted', Meeting: 'Meeting Arranged', Proposal: 'Proposal', Closure: 'Converted' };

const EMPTY_FORM = {
  companyName: '', contactTitle: '', contactName: '', designation: '',
  address1: '', address2: '', city: '', pin: '', state: '',
  phone: '', mobile: '', email: '',
  status: 'Yet to be Called', priority: 'Warm', dealValue: '0', source: '',
  assignedTo: '', comments: '',
  lastCalledDate: '', nextCallDate: '', meetingDate: '', meetingNotes: '',
  lostReason: '',
};

function Detail({ label, value, wrap }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80">{label}</div>
      <div className={`text-xs text-foreground font-medium ${wrap ? 'break-words' : 'truncate'}`}>{value || value === 0 ? value : '-'}</div>
    </div>
  );
}

// Single Lead Profile popup, reused everywhere a list needs "click a row to
// see everything" - Directory, Daily Calls, Follow-ups, Meetings, Pipeline.
// Same view<->edit toggle pattern already shipped for HR's Candidates.
export default function LeadProfileModal({ lead, onClose }) {
  const { setLeads, leads } = useSalesDesk();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [logging, setLogging] = useState(false);
  const [callOutcome, setCallOutcome] = useState('Contacted');
  const [callComment, setCallComment] = useState('');

  // Always read the freshest copy from context (another screen may have
  // updated it) instead of trusting the `lead` prop after first render.
  const current = lead ? leads.find((l) => l.id === lead.id) || lead : null;

  const reps = [...new Set(leads.map((l) => l.assignedTo).filter(Boolean))].sort();

  function syncForm(l) {
    setForm({ ...EMPTY_FORM, ...Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, l[k] ?? EMPTY_FORM[k]])) });
  }

  useEffect(() => {
    if (!current) return;
    syncForm(current);
    setEditOpen(false);
    setCallOutcome(current.status === 'Yet to be Called' ? 'Contacted' : current.status);
    setCallComment('');
  }, [current?.id]);

  function cancelEdit() {
    if (current) syncForm(current);
    setEditOpen(false);
  }

  async function save() {
    if (!current) return;
    setSaving(true);
    try {
      const payload = { ...form, dealValue: Number(form.dealValue) || 0 };
      const { data } = await salesLeadsApi.update(current.id, payload);
      setLeads((rows) => rows.map((l) => (l.id === current.id ? { ...l, ...data } : l)));
      toast.success('Lead updated');
      setEditOpen(false);
    } catch (e) {
      toast.error('Could not update lead', { description: e.response?.data?.error || e.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!current) return;
    if (!window.confirm(`Remove ${current.companyName} from the directory? This can't be undone.`)) return;
    try {
      await salesLeadsApi.remove(current.id);
      setLeads((rows) => rows.filter((l) => l.id !== current.id));
      onClose();
    } catch (e) {
      toast.error('Could not remove lead', { description: e.response?.data?.error || e.message });
    }
  }

  async function logCall() {
    if (!current) return;
    setLogging(true);
    try {
      const { data } = await salesLeadsApi.logCall(current.id, { outcome: callOutcome, comment: callComment });
      setLeads((rows) => rows.map((l) => (l.id === current.id ? { ...l, ...data } : l)));
      toast.success('Call logged');
      setCallComment('');
    } catch (e) {
      toast.error('Could not log call', { description: e.response?.data?.error || e.message });
    } finally {
      setLogging(false);
    }
  }

  return (
    <Modal open={!!lead} onClose={() => { onClose(); setEditOpen(false); }} title="Lead Profile" className="max-w-3xl max-h-[88vh] overflow-y-auto">
      {current && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-lg font-semibold text-foreground truncate">{current.companyName}</div>
              <div className="text-xs text-muted-foreground truncate">{current.contactTitle} {current.contactName}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge value={current.priority} />
              <Badge value={current.status} />
              {editOpen ? (
                <>
                  <button type="button" onClick={cancelEdit} className="px-3 py-1.5 rounded-lg bg-muted hover:bg-accent border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Cancel</button>
                  <button type="button" onClick={save} disabled={saving} className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setEditOpen(true)} title="Edit lead" aria-label="Edit lead" className="p-1.5 rounded-lg bg-muted hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    <Pencil size={13} />
                  </button>
                  <button type="button" onClick={remove} title="Delete lead" aria-label="Delete lead" className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive transition-colors cursor-pointer">
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          </div>

          {!editOpen && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Log a call</div>
                <ColorSelect
                  value={callOutcome}
                  onChange={setCallOutcome}
                  options={STATUS_VALUES.filter((s) => s !== 'Yet to be Called')}
                />
              </div>
              <div className="flex-[2]">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Comment (optional)</div>
                <input value={callComment} onChange={(e) => setCallComment(e.target.value)} className={inputClass} placeholder="What happened on the call?" />
              </div>
              <button type="button" onClick={logCall} disabled={logging} className="flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50 h-9">
                <PhoneCall size={13} /> {logging ? 'Logging…' : 'Log Call'}
              </button>
            </div>
          )}

          {editOpen ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Company"><input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} className={inputClass} /></Field>
                <Field label="Contact Title"><input value={form.contactTitle} onChange={(e) => setForm((f) => ({ ...f, contactTitle: e.target.value }))} className={inputClass} placeholder="Mr / Ms" /></Field>
                <Field label="Contact Name"><input value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} className={inputClass} /></Field>
                <Field label="Designation"><input value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} className={inputClass} /></Field>
                <Field label="Phone"><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputClass} /></Field>
                <Field label="Mobile"><input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} className={inputClass} /></Field>
                <Field label="Email"><input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} /></Field>
                <Field label="City"><input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={inputClass} /></Field>
                <Field label="State"><input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className={inputClass} /></Field>
              </div>
              <Field label="Address">
                <input value={form.address1} onChange={(e) => setForm((f) => ({ ...f, address1: e.target.value }))} className={`${inputClass} mb-2`} placeholder="Line 1" />
                <input value={form.address2} onChange={(e) => setForm((f) => ({ ...f, address2: e.target.value }))} className={inputClass} placeholder="Line 2" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Status">
                  <ColorSelect value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} options={STATUS_VALUES} />
                </Field>
                <Field label="Priority">
                  <ColorSelect value={form.priority} onChange={(v) => setForm((f) => ({ ...f, priority: v }))} options={PRIORITY_VALUES} />
                </Field>
                <Field label="Deal Value (₹)"><input type="number" min="0" value={form.dealValue} onChange={(e) => setForm((f) => ({ ...f, dealValue: e.target.value }))} className={inputClass} /></Field>
                <Field label="Source">
                  <input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} className={inputClass} list="sales-sources" />
                  <datalist id="sales-sources">{SOURCE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
                </Field>
                <Field label="Assigned To">
                  <input value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} className={inputClass} list="sales-reps" />
                  <datalist id="sales-reps">{reps.map((r) => <option key={r} value={r} />)}</datalist>
                </Field>
                <Field label="Last Called"><input type="date" value={form.lastCalledDate} onChange={(e) => setForm((f) => ({ ...f, lastCalledDate: e.target.value }))} className={inputClass} /></Field>
                <Field label="Next Call"><input type="date" value={form.nextCallDate} onChange={(e) => setForm((f) => ({ ...f, nextCallDate: e.target.value }))} className={inputClass} /></Field>
                <Field label="Meeting Date"><input type="date" value={form.meetingDate} onChange={(e) => setForm((f) => ({ ...f, meetingDate: e.target.value }))} className={inputClass} /></Field>
                {form.status === 'Lost' && (
                  <Field label="Lost Reason">
                    <ColorSelect
                      value={form.lostReason || '__none__'}
                      onChange={(v) => setForm((f) => ({ ...f, lostReason: v === '__none__' ? '' : v }))}
                      options={[{ value: '__none__', label: 'Select a reason' }, ...LOST_REASON_VALUES.map((r) => ({ value: r, label: r }))]}
                    />
                  </Field>
                )}
              </div>
              <Field label="Comments"><textarea rows={2} value={form.comments} onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))} className={inputClass} /></Field>
              <Field label="Meeting Notes"><textarea rows={2} value={form.meetingNotes} onChange={(e) => setForm((f) => ({ ...f, meetingNotes: e.target.value }))} className={inputClass} /></Field>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Detail label="Phone" value={current.phone} />
                <Detail label="Mobile" value={current.mobile} />
                <Detail label="Email" value={current.email} />
                <Detail label="City" value={current.city} />
                <Detail label="State" value={current.state} />
                <Detail label="Designation" value={current.designation} />
              </div>
              {(current.address1 || current.address2) && (
                <Detail label="Address" value={[current.address1, current.address2].filter(Boolean).join(', ')} wrap />
              )}
              <div className="grid grid-cols-3 gap-3">
                <Detail label="Deal Value" value={current.dealValue ? `₹${Number(current.dealValue).toLocaleString('en-IN')}` : null} />
                <Detail label="Source" value={current.source} />
                <Detail label="Assigned To" value={current.assignedTo} />
                <Detail label="Last Called" value={current.lastCalledDate} />
                <Detail label="Next Call" value={current.nextCallDate} />
                <Detail label="Meeting Date" value={current.meetingDate} />
                {current.status === 'Lost' && <Detail label="Lost Reason" value={current.lostReason} />}
              </div>
              {current.comments && <Detail label="Comments" value={current.comments} wrap />}
              {current.meetingNotes && <Detail label="Meeting Notes" value={current.meetingNotes} wrap />}
              {current.callLog?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80 mb-1.5">Call History</div>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                    {[...current.callLog].reverse().map((c, i) => (
                      <div key={i} className="text-xs bg-muted border border-border rounded-lg px-2.5 py-1.5">
                        <span className="font-semibold text-foreground">{c.outcome}</span>
                        <span className="text-muted-foreground"> · {c.by} · {new Date(c.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        {c.comment && <div className="text-muted-foreground mt-0.5">{c.comment}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
