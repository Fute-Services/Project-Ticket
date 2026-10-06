import { useEffect, useState } from 'react';
import { ExternalLink, Eye, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { SectionHeader, Modal, Field, inputClass } from './ui';
import { ColorSelect } from './TicketsQueueView';
import DataTable from './DataTable';
import { useAuth } from '../context/AuthContext';
import { getProjectSheet, createProjectSheetRow, updateProjectSheetRow } from '../utils/api';

const EMPTY = { projectCode: '', clientName: '', projectName: '', qty: '', scope: '', status: 'Active', outputDriveLink: '', asanaLink: '', remarks: '' };

export function LinkCell({ href, label }) {
  if (!href) return '—';
  const url = /^https?:\/\//i.test(href) ? href : `https://${href}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">
      <ExternalLink size={11} /> {label}
    </a>
  );
}

// One sheet shared by Sales and Coordinator. Sales edits the base columns;
// Asana link + Remarks are coordinator/founder-only (the backend enforces it too).
export default function ProjectSheetView({ Layout }) {
  const { user } = useAuth();
  const canEditExtra = user?.role !== 'sales';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = closed; object = open (has id when editing)
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState(null);

  function refresh() {
    setLoading(true);
    getProjectSheet()
      .then(({ data }) => setRows(data || []))
      .catch((e) => toast.error('Could not load sheet', { description: e.response?.data?.error || e.message }))
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { id, slNo, created_at, updated_at, ...body } = form;
      if (id) await updateProjectSheetRow(id, body);
      else await createProjectSheetRow(body);
      toast.success(id ? 'Row updated' : 'Row added');
      setForm(null);
      refresh();
    } catch (err) {
      toast.error('Could not save', { description: err.response?.data?.error || err.message });
    } finally {
      setSaving(false);
    }
  }

  async function patchStatus(id, status) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await updateProjectSheetRow(id, { status });
    } catch (err) {
      toast.error('Could not update status', { description: err.response?.data?.error || err.message });
      refresh();
    }
  }

  const columns = [
    { key: 'slNo', label: 'Sl no', width: '60px', render: (r) => <span className="text-muted-foreground font-semibold">{r.slNo}</span> },
    { key: 'projectCode', label: 'Project code', width: '150px', render: (r) => <span className="font-bold text-primary whitespace-nowrap">{r.projectCode}</span> },
    { key: 'clientName', label: 'Client name', width: '140px' },
    { key: 'projectName', label: 'Project name', width: '170px' },
    { key: 'qty', label: 'Qty', width: '160px' },
    { key: 'scope', label: 'Scope', width: '70px', align: 'right' },
    {
      key: 'status', label: 'Status', width: '120px', sortable: false,
      render: (r) => <ColorSelect value={r.status} onChange={(v) => patchStatus(r.id, v)} options={['Active', 'Closed']} ariaLabel={`Status for ${r.projectCode}`} />,
    },
    { key: 'outputDriveLink', label: 'Output Drive link', width: '110px', sortable: false, render: (r) => <LinkCell href={r.outputDriveLink} label="Drive" /> },
    { key: 'asanaLink', label: 'Asana link', width: '100px', sortable: false, render: (r) => <LinkCell href={r.asanaLink} label="Asana" /> },
    { key: 'remarks', label: 'Remarks', width: '240px', render: (r) => <span className="line-clamp-2">{r.remarks || '—'}</span> },
    {
      key: 'edit', label: '', width: '70px', sortable: false,
      render: (r) => (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setViewRow(r)} aria-label={`View ${r.projectCode}`} title="View" className="text-muted-foreground hover:text-primary cursor-pointer">
            <Eye size={14} />
          </button>
          <button type="button" onClick={() => setForm({ ...EMPTY, ...r })} aria-label={`Edit ${r.projectCode}`} title="Edit" className="text-muted-foreground hover:text-primary cursor-pointer">
            <Pencil size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-[1800px] mx-auto">
        <SectionHeader
          title="Project Sheet"
          subtitle={`${rows.length} projects · 2025-2026`}
          action={
            <button type="button" onClick={() => setForm(EMPTY)} className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer">
              <Plus size={14} /> Add Row
            </button>
          }
        />
        <DataTable
          loading={loading}
          rows={rows}
          pageSize={25}
          searchable
          searchKeys={['projectCode', 'clientName', 'projectName', 'qty', 'status']}
          searchPlaceholder="Search by code, client, project, status..."
          emptyMessage="No projects yet. Use “Add Row”."
          columns={columns}
        />
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title={viewRow ? `${viewRow.projectCode} · ${viewRow.projectName}` : ''} className="max-w-xl max-h-[85vh] overflow-y-auto">
        {viewRow && (
          <div className="flex flex-col gap-3 text-xs">
            {[
              ['Sl no', viewRow.slNo],
              ['Project code', viewRow.projectCode],
              ['Client name', viewRow.clientName],
              ['Project name', viewRow.projectName],
              ['Qty', viewRow.qty],
              ['Scope', viewRow.scope],
              ['Status', viewRow.status],
              ['Output Drive link', <LinkCell key="d" href={viewRow.outputDriveLink} label="Open Drive folder" />],
              ['Asana link', <LinkCell key="a" href={viewRow.asanaLink} label="Open in Asana" />],
              ['Remarks', <span key="r" className="whitespace-pre-wrap">{viewRow.remarks || '—'}</span>],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[130px_1fr] gap-3 border-b border-border/50 pb-2 last:border-0">
                <span className="text-muted-foreground font-semibold">{label}</span>
                <span className="text-foreground">{value === '' || value == null ? '—' : value}</span>
              </div>
            ))}
            <button
              type="button"
              onClick={() => { setForm({ ...EMPTY, ...viewRow }); setViewRow(null); }}
              className="mt-2 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Pencil size={13} /> Edit
            </button>
          </div>
        )}
      </Modal>

      <Modal open={!!form}onClose={() => setForm(null)} title={form?.id ? 'Edit Project' : 'Add Project'} className="max-w-xl max-h-[85vh] overflow-y-auto">
        {form && (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Project code"><input required value={form.projectCode} onChange={set('projectCode')} className={inputClass} placeholder="FS3D 001-2025-26" /></Field>
              <Field label="Client name"><input required value={form.clientName} onChange={set('clientName')} className={inputClass} /></Field>
            </div>
            <Field label="Project name"><input required value={form.projectName} onChange={set('projectName')} className={inputClass} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Qty (deliverable)"><input value={form.qty} onChange={set('qty')} className={inputClass} placeholder="3D walkthrough" /></Field>
              <Field label="Scope"><input value={form.scope} onChange={set('scope')} className={inputClass} /></Field>
            </div>
            <Field label="Status">
              <div className="flex gap-2">
                {[['Active', 'Active'], ['Closed', 'Closed'], ['', 'None']].map(([v, label]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, status: v }))}
                    className={`flex-1 text-xs font-semibold py-2 rounded-xl border transition-colors cursor-pointer ${
                      form.status === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Output Drive link"><input value={form.outputDriveLink} onChange={set('outputDriveLink')} className={inputClass} placeholder="drive.google.com/..." /></Field>
            {canEditExtra && (
              <>
                <Field label="Asana link"><input value={form.asanaLink} onChange={set('asanaLink')} className={inputClass} placeholder="app.asana.com/..." /></Field>
                <Field label="Remarks"><textarea value={form.remarks} onChange={set('remarks')} className={`${inputClass} h-20`} /></Field>
              </>
            )}
            <button type="submit" disabled={saving} className="mt-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
