import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Clock, CheckCircle2, Plus, Search, X, Play, Film } from 'lucide-react';
import { useRenders } from '../context/RenderContext';
import ItDatePicker from './ItDatePicker';
import DataTable from './DataTable';
import { Card, SectionHeader, StatCard, Modal, Field, inputClass } from './ui';
import { ColorSelect } from './TicketsQueueView';

// Read-only for IT - Production owns adding jobs and marking them complete
// (ProductionDashboardView), so this mirrors that same shared RenderContext
// list rather than giving IT its own editable copy of someone else's queue.
function AddRenderModal({ isOpen, onClose, onAdd }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    sequence: '',
    frameNo: '',
    personName: 'Sameer Kulkarni',
    endDate: '',
    status: 'Queue',
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.sequence.trim()) {
      toast.error('Please enter a sequence name');
      return;
    }
    onAdd(form);
    toast.success('New render job added to queue!', {
      description: `${form.sequence} (${form.frameNo || '1 frame'})`,
    });
    onClose();
    setForm({
      date: new Date().toISOString().slice(0, 10),
      sequence: '',
      frameNo: '',
      personName: 'Sameer Kulkarni',
      endDate: '',
      status: 'Queue',
    });
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Add New Render Job">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date">
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="Target End Date">
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Sequence / Scene Name">
          <input
            required
            type="text"
            value={form.sequence}
            onChange={(e) => setForm((f) => ({ ...f, sequence: e.target.value }))}
            placeholder="e.g. SQ01_SC04_v2 or Main Intro Shot"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Frame Range / Frame No">
            <input
              type="text"
              value={form.frameNo}
              onChange={(e) => setForm((f) => ({ ...f, frameNo: e.target.value }))}
              placeholder="e.g. 100-300 or 1-500"
              className={inputClass}
            />
          </Field>
          <Field label="Initial Status">
            <ColorSelect
              value={form.status}
              onChange={(v) => setForm((f) => ({ ...f, status: v }))}
              options={['Queue', 'Pending', 'On Hold', 'Completed']}
            />
          </Field>
        </div>

        <Field label="Assigned Artist / Engineer">
          <ColorSelect
            value={form.personName}
            onChange={(v) => setForm((f) => ({ ...f, personName: v }))}
            options={['Sameer Kulkarni', 'Priya Nair', 'John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'Robert Brown', 'Unassigned']}
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Add Render Job</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function RenderingStatusView() {
  const { renders, addRender, updateRenderField, hasMoreRenders, loadMoreRenders, loadingMore } = useRenders();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeJobs = renders.filter((r) => r.status === 'Queue' || r.status === 'Pending').length;

  const visibleRenders = useMemo(() => {
    if (!searchQuery.trim()) return renders;
    const q = searchQuery.trim().toLowerCase();
    return renders.filter((r) => (
      (r.sequence && r.sequence.toLowerCase().includes(q)) ||
      (r.personName && r.personName.toLowerCase().includes(q)) ||
      (r.frameNo && String(r.frameNo).toLowerCase().includes(q)) ||
      (r.status && r.status.toLowerCase().includes(q)) ||
      (r.date && r.date.toLowerCase().includes(q)) ||
      (r.endDate && r.endDate.toLowerCase().includes(q))
    ));
  }, [renders, searchQuery]);

  return (
    <div className="w-full flex flex-col gap-6">
      <AddRenderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addRender}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Rendering Status</h1>
          <p className="text-xs text-muted-foreground">Live view of the Production Floor render farm</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Render</span>
          </button>
          <ItDatePicker />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard icon={Film} label="Total Renders" value={renders.length} sub="jobs recorded" accent="hsl(var(--chart-1))" />
        <StatCard icon={Play} label="Active / Queue" value={activeJobs} sub="jobs in flight" accent="hsl(var(--chart-2))" />
        <StatCard icon={Clock} label="On Hold" value={renders.filter((r) => r.status === 'On Hold').length} sub="paused jobs" accent="hsl(var(--chart-3))" />
        <StatCard icon={CheckCircle2} label="Completed" value={renders.filter((r) => r.status === 'Completed').length} sub="jobs finished" accent="hsl(var(--chart-4))" />
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <SectionHeader title="Render Queue" subtitle={`${renders.length} job${renders.length === 1 ? '' : 's'} on the farm`} />
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sequence, artist, status..."
              aria-label="Search renders"
              className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <DataTable
          rows={visibleRenders}
          pageSize={10}
          emptyMessage={searchQuery ? `No render jobs matching "${searchQuery}".` : "No render jobs logged yet."}
          columns={[
            {
              key: 'sno',
              label: 'S.No.',
              width: '60px',
              sortable: false,
              render: (_, index) => <span className="text-muted-foreground font-semibold text-xs">{(index ?? 0) + 1}</span>,
            },
            {
              key: 'date',
              label: 'Date',
              width: '100px',
              render: (r) => <span className="text-muted-foreground text-xs whitespace-nowrap">{r.date || '-'}</span>,
            },
            {
              key: 'sequence',
              label: 'Sequence',
              width: '170px',
              sortable: false,
              render: (r) => (
                <input
                  type="text"
                  value={r.sequence || ''}
                  onChange={(e) => updateRenderField && updateRenderField(r.id, 'sequence', e.target.value)}
                  placeholder="Type sequence..."
                  className="w-full bg-background border border-input rounded-md px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60"
                />
              ),
            },
            {
              key: 'frameNo',
              label: 'Frame No',
              width: '170px',
              sortable: false,
              render: (r) => (
                <input
                  type="text"
                  value={r.frameNo || ''}
                  onChange={(e) => updateRenderField && updateRenderField(r.id, 'frameNo', e.target.value)}
                  placeholder="Type frame no..."
                  className="w-full bg-background border border-input rounded-md px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60"
                />
              ),
            },
            {
              key: 'personName',
              label: 'Assigned To',
              width: '160px',
              render: (r) => (
                <ColorSelect
                  value={r.personName || 'Unassigned'}
                  onChange={(v) => updateRenderField && updateRenderField(r.id, 'personName', v)}
                  ariaLabel={`Assigned employee for render job ${r.id}`}
                  options={['Kapil Chauhan', 'Tilottama Paramanik', 'Vipin', 'Himanshu', 'Kanhu', 'Sonali Das', 'Debashish Das', 'Unassigned']}
                />
              ),
            },
            {
              key: 'endDate',
              label: 'End Date',
              width: '135px',
              sortable: false,
              render: (r) => (
                <input
                  type="date"
                  value={r.endDate || ''}
                  onChange={(e) => updateRenderField && updateRenderField(r.id, 'endDate', e.target.value)}
                  className="w-full bg-background border border-input rounded-md px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              ),
            },
            {
              key: 'status',
              label: 'Status',
              width: '140px',
              render: (r) => (
                <ColorSelect
                  value={r.status || 'Queue'}
                  onChange={(v) => updateRenderField && updateRenderField(r.id, 'status', v)}
                  ariaLabel={`Status for render job ${r.id}`}
                  options={['Completed', 'Pending', 'On Hold', 'Queue']}
                />
              ),
            },
          ]}
        />
      </Card>

      {hasMoreRenders && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMoreRenders}
            disabled={loadingMore}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
