import { useEffect, useState } from 'react';
import { ExternalLink, Plus } from 'lucide-react';
import CoordinatorLayout from '../../components/coordinator/CoordinatorLayout';
import { SectionHeader, Modal, Field, inputClass } from '../../components/ui';
import { ColorSelect } from '../../components/TicketsQueueView';
import DataTable from '../../components/DataTable';
import { useTaskProject } from '../../context/TaskProjectContext';
import { useEmployeeDirectory } from '../../hooks/useEmployeeDirectory';
import { useAuth } from '../../context/AuthContext';
import { getProductionRecords, createProductionRecord, updateProductionRecord } from '../../utils/api';
import { toast } from 'sonner';

const PRODUCTION_STATUSES = ['Not Started', 'Under Production', 'Delivered'];
const INPUTS_STATUSES = ['Pending', 'Partial', 'Complete'];
const CLOSURE_STATUSES = ['Open', 'Closed'];
const BILLING_STATUSES = ['Not Billed', 'Invoice Raised', 'Partially Paid', 'Paid'];

const EMPTY_FORM = (projects) => ({
  projectId: projects[0]?.id || '',
  projectCode: '',
  scopeOfWork: '',
  qty: '',
  assignedPersonId: '',
  clientPOC: '',
  deliveryDeadline: '',
  outputDriveLink: '',
});

export default function CoordinatorDeliveryTracker() {
  const { user } = useAuth();
  const { projects } = useTaskProject();
  const { employees, nameOf } = useEmployeeDirectory();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(() => EMPTY_FORM(projects));
  const [saving, setSaving] = useState(false);

  function refresh() {
    setLoading(true);
    getProductionRecords()
      .then(({ data }) => setRecords(data || []))
      .catch((e) => console.error('Failed to load production records:', e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  function projectOf(r) {
    return projects.find((p) => p.id === r.projectId);
  }

  // pcCoordinatorId is auto-set to whoever creates the record (see submit())
  // rather than a picker - this app has coordinators managing the whole
  // team-wide board already, so "which coordinator logged this" is an
  // attribution field, not a routing decision someone needs to choose.
  function coordinatorNameOf(id) {
    return id === user?.id ? user?.full_name : 'Coordinator';
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createProductionRecord({
        ...form,
        qty: form.qty === '' ? 0 : Number(form.qty),
        pcCoordinatorId: user?.id,
      });
      toast.success('Delivery tracker entry created');
      setShowModal(false);
      setForm(EMPTY_FORM(projects));
      refresh();
    } catch (err) {
      toast.error('Could not create entry', { description: err.response?.data?.error || err.message });
    } finally {
      setSaving(false);
    }
  }

  // Inline status-column edits - optimistic, reverts (via refresh) on a
  // rejected request, e.g. the closureStatus="Closed"-before-Delivered rule.
  async function patchRecord(id, patch) {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    try {
      const { data } = await updateProductionRecord(id, patch);
      setRecords((prev) => prev.map((r) => (r.id === id ? data : r)));
    } catch (err) {
      toast.error('Could not update entry', { description: err.response?.data?.error || err.message });
      refresh();
    }
  }

  return (
    <CoordinatorLayout>
      <div className="flex flex-col gap-6 max-w-[1800px] mx-auto">
        <SectionHeader
          title="Production & Delivery Tracker"
          subtitle={`${records.length} entries`}
          action={
            <button
              type="button"
              onClick={() => setShowModal(true)}
              disabled={projects.length === 0}
              title={projects.length === 0 ? 'Create a project first' : undefined}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
              New Entry
            </button>
          }
        />

        <DataTable
          loading={loading}
          rows={records}
          pageSize={15}
          searchable
          searchKeys={['projectCode', 'scopeOfWork', 'clientPOC']}
          searchPlaceholder="Search by project code, scope, client POC..."
          emptyMessage="No delivery tracker entries yet. Use “New Entry” to log the first one."
          columns={[
            {
              key: 'sno',
              label: 'Sl. No.',
              width: '60px',
              sortable: false,
              render: (_, i) => <span className="text-muted-foreground font-semibold">{(i ?? 0) + 1}</span>,
            },
            { key: 'created_at', label: 'Date', width: '95px', render: (r) => <span className="whitespace-nowrap">{(r.created_at || '').slice(0, 10)}</span> },
            { key: 'projectCode', label: 'Project Code', width: '100px', render: (r) => <span className="font-bold text-primary">{r.projectCode}</span> },
            {
              key: 'project',
              label: 'Project / Client',
              width: '160px',
              sortable: false,
              render: (r) => {
                const p = projectOf(r);
                return p ? (
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">{p.name}</div>
                    <div className="text-muted-foreground truncate">{p.client}</div>
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">Unknown project</span>
                );
              },
            },
            { key: 'scopeOfWork', label: 'Scope of Work', width: '180px', render: (r) => <span className="line-clamp-2">{r.scopeOfWork}</span> },
            { key: 'qty', label: 'Qty.', width: '55px', align: 'right', render: (r) => r.qty },
            { key: 'assignedPersonId', label: 'Assigned (Production)', width: '130px', render: (r) => nameOf(r.assignedPersonId) },
            { key: 'clientPOC', label: 'Client POC', width: '110px' },
            {
              key: 'productionStatus',
              label: 'Project Status',
              width: '140px',
              sortable: false,
              render: (r) => (
                <ColorSelect
                  value={r.productionStatus}
                  onChange={(v) => patchRecord(r.id, { productionStatus: v })}
                  options={PRODUCTION_STATUSES}
                  ariaLabel={`Project status for ${r.projectCode}`}
                />
              ),
            },
            { key: 'startDate', label: 'Start Date', width: '95px', sortable: false, render: (r) => projectOf(r)?.startDate || '—' },
            { key: 'deliveryDeadline', label: 'Delivery Deadline', width: '110px' },
            {
              key: 'inputsStatus',
              label: 'Inputs Status',
              width: '120px',
              sortable: false,
              render: (r) => (
                <ColorSelect
                  value={r.inputsStatus}
                  onChange={(v) => patchRecord(r.id, { inputsStatus: v })}
                  options={INPUTS_STATUSES}
                  ariaLabel={`Inputs status for ${r.projectCode}`}
                />
              ),
            },
            { key: 'pcCoordinatorId', label: 'PC Coordinator', width: '110px', sortable: false, render: (r) => coordinatorNameOf(r.pcCoordinatorId) },
            {
              key: 'closureStatus',
              label: 'Closure Status',
              width: '120px',
              sortable: false,
              render: (r) => (
                <ColorSelect
                  value={r.closureStatus}
                  onChange={(v) => patchRecord(r.id, { closureStatus: v })}
                  options={CLOSURE_STATUSES}
                  ariaLabel={`Closure status for ${r.projectCode}`}
                />
              ),
            },
            { key: 'actualDeliveryDate', label: 'Actual Delivery Date', width: '110px', render: (r) => r.actualDeliveryDate || '—' },
            { key: 'deliveryRemarks', label: 'Delivery Remarks', width: '160px', render: (r) => r.deliveryRemarks || '—' },
            {
              key: 'outputDriveLink',
              label: 'Output Drive Link',
              width: '90px',
              sortable: false,
              render: (r) =>
                r.outputDriveLink ? (
                  <a href={r.outputDriveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">
                    <ExternalLink size={11} /> Open
                  </a>
                ) : (
                  '—'
                ),
            },
            {
              key: 'billingStatus',
              label: 'Billing Status',
              width: '130px',
              sortable: false,
              render: (r) => (
                <ColorSelect
                  value={r.billingStatus}
                  onChange={(v) => patchRecord(r.id, { billingStatus: v })}
                  options={BILLING_STATUSES}
                  ariaLabel={`Billing status for ${r.projectCode}`}
                />
              ),
            },
          ]}
        />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Delivery Tracker Entry" className="max-w-xl max-h-[85vh] overflow-y-auto">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Project">
            <select required value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} className={inputClass}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.client}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Project Code">
              <input required value={form.projectCode} onChange={(e) => setForm((f) => ({ ...f, projectCode: e.target.value }))} className={inputClass} placeholder="e.g. PRJ-014" />
            </Field>
            <Field label="Qty.">
              <input type="number" min="0" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label="Scope of Work">
            <textarea required value={form.scopeOfWork} onChange={(e) => setForm((f) => ({ ...f, scopeOfWork: e.target.value }))} className={`${inputClass} h-20`} />
          </Field>
          <Field label="Assigned Person (Production)">
            <select value={form.assignedPersonId} onChange={(e) => setForm((f) => ({ ...f, assignedPersonId: e.target.value }))} className={inputClass}>
              <option value="">— Unassigned —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Client POC">
            <input value={form.clientPOC} onChange={(e) => setForm((f) => ({ ...f, clientPOC: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Delivery Deadline (Sales Committed)">
            <input type="date" value={form.deliveryDeadline} onChange={(e) => setForm((f) => ({ ...f, deliveryDeadline: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Output Drive Link (optional)">
            <input value={form.outputDriveLink} onChange={(e) => setForm((f) => ({ ...f, outputDriveLink: e.target.value }))} className={inputClass} placeholder="drive.google.com/..." />
          </Field>
          <button
            type="submit"
            disabled={saving}
            className="mt-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating…' : 'Create Entry'}
          </button>
        </form>
      </Modal>
    </CoordinatorLayout>
  );
}
