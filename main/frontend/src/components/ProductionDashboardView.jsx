import { useState } from 'react';
import { Play, CheckCircle2, Cpu, Film, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { useRenders, frameCount } from '../context/RenderContext';
import { Card, SectionHeader, StatCard, Modal, Field, inputClass } from './ui';
import DataTable from './DataTable';

const SEQUENCE_TYPES = ['Steel', 'Animal', '360'];

const EMPTY_FORM = () => ({
  projectCode: '',
  sequenceType: SEQUENCE_TYPES[0],
  frameNo: '',
  personName: '',
  date: new Date().toISOString().slice(0, 10),
  allocatedSystems: 1,
});

/**
 * Interactive Production Floor dashboard — replaces the read-only demo view
 * (FounderDeptView + deptDemoData) for anyone logged in with the production
 * role specifically. Render jobs live in RenderContext, not local state —
 * the IT desk's read-only "Rendering Status" view reads the exact same list,
 * so a job logged here shows up there immediately (same pattern as
 * TicketContext for the "Report to IT" ticket below).
 */
export default function ProductionDashboardView() {
  const { user } = useAuth();
  const { addTicket } = useTickets();
  const { renders, addRender, toggleStatus } = useRenders();
  const [form, setForm] = useState(EMPTY_FORM);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDetails, setIssueDetails] = useState('');
  const [addingRender, setAddingRender] = useState(false);
  const [reporting, setReporting] = useState(false);

  const totalFrames = renders.reduce((sum, r) => sum + frameCount(r.frameNo), 0);
  const allocatedSystems = renders.filter((r) => r.status === 'Rendering').reduce((sum, r) => sum + Number(r.allocatedSystems || 0), 0);

  async function handleAddRender(e) {
    e.preventDefault();
    if (!form.projectCode.trim() || !form.frameNo.trim() || !form.personName.trim()) {
      toast.error('Project code, frame range, and name are required.');
      return;
    }
    setAddingRender(true);
    try {
      await addRender({ ...form, allocatedSystems: Number(form.allocatedSystems) || 1 });
      toast.success('Render job added', { description: `${form.projectCode} · ${form.frameNo}` });
      setForm(EMPTY_FORM());
    } catch (err) {
      toast.error('Could not add render job', { description: err.response?.data?.error || err.message });
    } finally {
      setAddingRender(false);
    }
  }

  async function submitReport(e) {
    e.preventDefault();
    if (!issueTitle.trim()) {
      toast.error('Describe the issue before sending it to IT.');
      return;
    }
    setReporting(true);
    try {
      await addTicket(
        { description: issueDetails.trim() ? `${issueTitle.trim()} — ${issueDetails.trim()}` : issueTitle.trim(), department: 'Production' },
        user?.full_name
      );
      toast.success('Reported to IT', { description: 'The ticket is in the IT Service Desk queue now.' });
      setIssueTitle('');
      setIssueDetails('');
      setReportModalOpen(false);
    } catch (err) {
      toast.error('Could not report to IT', { description: err.response?.data?.error || err.message });
    } finally {
      setReporting(false);
    }
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Production Floor</h1>
          <p className="text-xs text-muted-foreground">Delivery schedule, render capacity, and job quality</p>
        </div>
        <button
          type="button"
          onClick={() => setReportModalOpen(true)}
          className="bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Send size={14} />
          <span>Report to IT</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard icon={Film} label="Total Frame Renders" value={totalFrames} sub="frames across all jobs" accent="hsl(var(--chart-1))" />
        <StatCard icon={Cpu} label="Allocated Systems" value={allocatedSystems} sub="on active renders" accent="hsl(var(--chart-2))" />
        <StatCard icon={Play} label="Rendering" value={renders.filter((r) => r.status === 'Rendering').length} sub="jobs in flight" accent="hsl(var(--chart-3))" />
        <StatCard icon={CheckCircle2} label="Completed" value={renders.filter((r) => r.status === 'Completed').length} sub="jobs finished" accent="hsl(var(--chart-4))" />
      </div>

      <Card>
        <SectionHeader title="Update Render Frame" subtitle="Log a new frame range onto the render farm" />
        <form onSubmit={handleAddRender} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Project Code">
            <input
              required
              value={form.projectCode}
              onChange={(e) => setForm((f) => ({ ...f, projectCode: e.target.value }))}
              placeholder="e.g. PRJ-VFX-04"
              className={inputClass}
            />
          </Field>
          <Field label="Sequence Type">
            <select value={form.sequenceType} onChange={(e) => setForm((f) => ({ ...f, sequenceType: e.target.value }))} className={inputClass}>
              {SEQUENCE_TYPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Frame No" hint="e.g. 100-300">
            <input
              required
              value={form.frameNo}
              onChange={(e) => setForm((f) => ({ ...f, frameNo: e.target.value }))}
              placeholder="100-300"
              className={inputClass}
            />
          </Field>
          <Field label="Name of Person">
            <input
              required
              value={form.personName}
              onChange={(e) => setForm((f) => ({ ...f, personName: e.target.value }))}
              placeholder="Who's running this render"
              className={inputClass}
            />
          </Field>
          <Field label="Date">
            <input required type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Allocated Systems">
            <input
              required
              type="number"
              min={1}
              value={form.allocatedSystems}
              onChange={(e) => setForm((f) => ({ ...f, allocatedSystems: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <button
            type="submit"
            disabled={addingRender}
            className="sm:col-span-2 lg:col-span-3 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {addingRender ? 'Adding…' : 'Add Render Job'}
          </button>
        </form>
      </Card>

      <Card>
        <SectionHeader title="Rendering Queue" subtitle={`${renders.length} job${renders.length === 1 ? '' : 's'} on the farm`} />
        <DataTable
          rows={renders}
          pageSize={10}
          emptyMessage="No render jobs yet — add one above."
          columns={[
            { key: 'projectCode', label: 'Project Code', render: (r) => <span className="font-bold text-primary">{r.projectCode}</span> },
            { key: 'sequenceType', label: 'Sequence', render: (r) => <span className="text-foreground">{r.sequenceType}</span> },
            { key: 'frameNo', label: 'Frame No', render: (r) => <span className="text-muted-foreground">{r.frameNo}</span> },
            { key: 'date', label: 'Date', render: (r) => <span className="text-muted-foreground">{r.date}</span> },
            { key: 'allocatedSystems', label: 'Systems', render: (r) => <span className="text-muted-foreground">{r.allocatedSystems}</span> },
            {
              key: 'status',
              label: 'Status',
              render: (r) => (
                <button
                  type="button"
                  onClick={() => toggleStatus(r.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    r.status === 'Completed'
                      ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                      : 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20'
                  }`}
                >
                  {r.status}
                </button>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={reportModalOpen} onClose={() => setReportModalOpen(false)} title="Report Issue to IT" description="Raises a ticket directly in the IT Service Desk queue.">
        <form onSubmit={submitReport} className="flex flex-col gap-3">
          <Field label="Issue">
            <input
              required
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              placeholder="e.g. Render Node Server 70 GPU Crash"
              className={inputClass}
            />
          </Field>
          <Field label="Details (optional)">
            <textarea
              rows={3}
              value={issueDetails}
              onChange={(e) => setIssueDetails(e.target.value)}
              placeholder="Anything IT should know before they pick this up..."
              className={`${inputClass} resize-none`}
            />
          </Field>
          <button
            type="submit"
            disabled={reporting}
            className="mt-1 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {reporting ? 'Sending…' : 'Send to IT'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
