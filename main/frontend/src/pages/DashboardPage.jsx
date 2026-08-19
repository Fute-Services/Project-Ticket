import React, { useMemo, useState } from 'react';
import { useTickets } from '../context/TicketContext';
import { useApprovals } from '../context/ApprovalContext';
import { useAuth } from '../context/AuthContext';
import { useRenders, frameCount } from '../context/RenderContext';
import { useAssets } from '../context/AssetContext';
import { toast } from 'sonner';
import ItDeskLayout from '../components/ItDeskLayout';
import ItDatePicker from '../components/ItDatePicker';
import DonutChart from '../components/DonutChart';
import DataTransferModal from '../components/DataTransferModal';
import AssetFormModal from '../components/AssetFormModal';
import DataTable from '../components/DataTable';
import TicketsQueueView, { TICKET_STATUSES } from '../components/TicketsQueueView';
import ApprovalCenterView from '../components/ApprovalCenterView';
import { BarChartCard, LineChartCard } from '../components/charts';
import { Card, SectionHeader, StatCard, Drawer, Modal, Field, inputClass } from '../components/ui';
import { ASSET_TYPES } from '../data/itMockData';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Server,
  Monitor,
  Laptop,
  Printer,
  Wifi,
  Plus,
  Pencil,
  Trash2,
  Download,
  ChevronDown,
  X,
  Search,
  Eye,
  HardDrive,
  History as HistoryIcon,
  Cpu,
  Play,
  Film,
} from 'lucide-react';

function DataRequestsView({ requests, onNewRequest }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Data Requests</h1>
          <p className="text-xs text-muted-foreground">{requests.length} transfer requests</p>
        </div>
        <div className="flex items-center gap-2.5">
          <ItDatePicker />
          <button
            type="button"
            onClick={onNewRequest}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
          >
            <Server size={15} />
            <span>New Data Request</span>
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        {requests.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No data transfer requests yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {requests.map((d) => {
              const expanded = expandedId === d.id;
              const hasDetails = d.requesterName || d.requesterNumber || d.backupName || d.priority || d.targetApprover || d.serverTag;
              return (
                <div key={d.id} className="rounded-lg bg-muted border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => hasDetails && setExpandedId(expanded ? null : d.id)}
                    aria-expanded={expanded}
                    className={`w-full p-3.5 flex items-center justify-between gap-3 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning shrink-0">
                        <Server size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">{d.path}</div>
                        <div className="text-xs text-muted-foreground truncate">{d.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                          d.status === 'Completed'
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : d.status === 'In Progress'
                            ? 'bg-muted/10 text-muted-foreground border-muted/20'
                            : 'bg-warning/10 text-warning border-warning/20'
                        }`}
                      >
                        {d.status}
                      </span>
                      {hasDetails && (
                        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </button>

                  {expanded && hasDetails && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                      {d.requesterName && (
                        <div>
                          <div className="text-xs text-muted-foreground">Requester Contact</div>
                          <div className="text-xs font-semibold text-foreground">{d.requesterName}{d.requesterNumber ? ` · ${d.requesterNumber}` : ''}</div>
                        </div>
                      )}
                      {d.backupName && (
                        <div>
                          <div className="text-xs text-muted-foreground">Backup Name</div>
                          <div className="text-xs font-semibold text-foreground">{d.backupName}</div>
                        </div>
                      )}
                      {d.priority && (
                        <div>
                          <div className="text-xs text-muted-foreground">Priority</div>
                          <div className="text-xs font-semibold text-foreground">{d.priority}</div>
                        </div>
                      )}
                      {d.targetApprover && (
                        <div>
                          <div className="text-xs text-muted-foreground">Target Approver</div>
                          <div className="text-xs font-semibold text-foreground">{d.targetApprover}</div>
                        </div>
                      )}
                      {d.serverTag && (
                        <div>
                          <div className="text-xs text-muted-foreground">Tag</div>
                          <div className="text-xs font-semibold text-foreground">{d.serverTag}</div>
                        </div>
                      )}
                      {d.purpose && (
                        <div className="col-span-2 sm:col-span-3">
                          <div className="text-xs text-muted-foreground">Purpose</div>
                          <div className="text-xs text-foreground">{d.purpose}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const ASSET_TYPE_ICON = {
  Laptop,
  Desktop: Monitor,
  Server,
  Network: Wifi,
  Printer,
};

const ASSET_STATUS_COLOR = {
  'In Use': 'bg-primary/10 text-primary border-primary/20',
  Available: 'bg-muted/10 text-muted-foreground border-muted/20',
  'Under Repair': 'bg-warning/10 text-warning border-warning/20',
  Retired: 'bg-muted/10 text-muted-foreground border-muted/20',
};

function AssetsView() {
  const { approvals, submitApproval } = useApprovals();
  const { assets, addOrUpdateAsset, patchAsset, removeAsset, restoreAsset } = useAssets();
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [auditAsset, setAuditAsset] = useState(null);
  const [deleteAsset, setDeleteAsset] = useState(null);

  const visible = useMemo(() => {
    return assets
      .filter((a) => typeFilter === 'All' || a.type === typeFilter)
      .filter((a) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        return (
          (a.id && a.id.toLowerCase().includes(q)) ||
          (a.model && a.model.toLowerCase().includes(q)) ||
          (a.assignedTo && a.assignedTo.toLowerCase().includes(q)) ||
          (a.department && a.department.toLowerCase().includes(q))
        );
      });
  }, [assets, typeFilter, searchQuery]);

  // Warranty is "expiring" if it lapses within 90 days of the demo date —
  // the whole point of tracking it is catching that before it lapses.
  const soon = new Date('2026-08-06');
  soon.setDate(soon.getDate() + 90);
  const expiring = assets.filter((a) => new Date(a.warrantyEnd) <= soon && a.status !== 'Retired').length;

  function openAddModal() {
    setEditingAsset(null);
    setModalOpen(true);
  }

  function openEditModal(asset) {
    setEditingAsset(asset);
    setModalOpen(true);
  }

  async function handleSubmit(asset) {
    const isEdit = !!editingAsset;
    await addOrUpdateAsset(asset, isEdit);
    toast.success(isEdit ? `Saved ${asset.id}` : `Added ${asset.id}`, { description: asset.model });
  }

  async function handleRequestApproval(asset) {
    try {
      await submitApproval({
        assetIdRef: asset.id,
        title: `Asset Approval: ${asset.model}`,
        sub: `${asset.id} · ${asset.assignedTo || 'IT Store'} (${asset.department})`,
        requestedBy: 'IT Desk',
        category: 'Hardware',
        priority: 'high',
        status: 'pending_founder',
      });
    } catch (err) {
      toast.error('Could not send approval request', { description: err.response?.data?.error || err.message });
      return;
    }

    patchAsset(asset.id, { approvalStatus: 'pending_founder' });

    toast.success(`Approval request sent to Founder for ${asset.id}`, {
      description: `${asset.model} added to Founder approval queue.`,
    });
  }

  // A confirm step first (this is a real delete, not just hiding a row),
  // then the toast still carries an Undo — belt and suspenders for
  // something that can't be recovered from this screen otherwise.
  async function handleDelete(id) {
    const removed = await removeAsset(id);
    setDeleteAsset(null);
    toast.success(`Deleted ${id}`, {
      description: removed?.model,
      action: {
        label: 'Undo',
        onClick: () => restoreAsset(removed),
      },
    });
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Asset Management</h1>
          <p className="text-xs text-muted-foreground">
            {assets.length} assets tracked · {expiring} warranty expiring within 90 days
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <ItDatePicker />
          <button
            type="button"
            onClick={openAddModal}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ASSET_TYPES.map((type) => {
          const Icon = ASSET_TYPE_ICON[type];
          const count = assets.filter((a) => a.type === type).length;
          const inUse = assets.filter((a) => a.type === type && a.status === 'In Use').length;
          return (
            <div key={type} className="bg-card border border-border rounded-lg p-3.5 text-center">
              <Icon size={18} className="mx-auto text-muted-foreground mb-1.5" />
              <div className="text-xs text-muted-foreground">{type}s</div>
              <div className="text-lg font-bold text-foreground mt-0.5">{count}</div>
              <div className="text-xs text-primary">{inUse} in use</div>
            </div>
          );
        })}
      </div>

      <Card>
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by asset ID, model, serial no, user, or department…"
            aria-label="Search assets"
            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {['All', ...ASSET_TYPES].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                typeFilter === t ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'All' ? 'All' : `${t}s`}
            </button>
          ))}
        </div>

        <DataTable
          rows={visible}
          pageSize={10}
          emptyMessage="No assets match your search or filter criteria."
          emptyAction={
            <button
              type="button"
              onClick={openAddModal}
              className="mt-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Add an asset
            </button>
          }
          columns={[
            {
              key: 'id',
              label: 'Asset ID',
              width: '110px',
              render: (a) => <span className="font-bold text-primary">{a.id}</span>,
            },
            { key: 'model', label: 'Model', render: (a) => <span className="text-foreground">{a.model}</span> },
            { key: 'serialNo', label: 'Serial No', render: (a) => <span className="text-muted-foreground font-mono text-xs">{a.serialNo || '—'}</span> },
            { key: 'assignedTo', label: 'Assigned To', render: (a) => <span className="text-muted-foreground">{a.assignedTo}</span> },
            { key: 'department', label: 'Department', render: (a) => <span className="text-muted-foreground">{a.department}</span> },
            { key: 'purchaseDate', label: 'Purchased', render: (a) => <span className="text-muted-foreground">{a.purchaseDate}</span> },
            {
              key: 'warrantyEnd',
              label: 'Warranty Until',
              render: (a) => {
                const expiringSoon = new Date(a.warrantyEnd) <= soon && a.status !== 'Retired';
                return (
                  <span className={expiringSoon ? 'text-warning font-semibold' : 'text-muted-foreground'}>
                    {a.warrantyEnd}
                  </span>
                );
              },
            },
            {
              key: 'status',
              label: 'Status',
              render: (a) => (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap ${ASSET_STATUS_COLOR[a.status]}`}>
                  {a.status}
                </span>
              ),
            },
            {
              key: 'approval',
              label: 'Approval',
              sortable: false,
              width: '160px',
              render: (a) => {
                const matched = approvals.find(
                  (app) => app.assetIdRef === a.id || (app.sub && app.sub.includes(a.id)) || (app.title && app.title.includes(a.id))
                );

                const status = matched ? matched.status : (a.approvalStatus || 'none');

                if (status === 'approved') {
                  return (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold bg-emerald-500/10 text-emerald-500 border-emerald-500/20 whitespace-nowrap">
                      <CheckCircle2 size={12} /> Approved
                    </span>
                  );
                }

                if (status === 'rejected' || status === 'not_approved') {
                  return (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold bg-red-500/10 text-red-500 border-red-500/20 whitespace-nowrap">
                      <XCircle size={12} /> Not Approved
                    </span>
                  );
                }

                if (status === 'pending_founder' || status === 'pending') {
                  return (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold bg-amber-500/10 text-amber-500 border-amber-500/20 whitespace-nowrap">
                      <Clock size={12} /> Pending Approval
                    </span>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={() => handleRequestApproval(a)}
                    className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-3 py-1 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
                  >
                    Request Approval
                  </button>
                );
              },
            },
            {
              key: 'actions',
              label: 'Actions',
              sortable: false,
              width: '130px',
              render: (a) => (
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => openEditModal(a)}
                    className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-semibold text-xs px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title="Edit all fields of this asset"
                  >
                    <Pencil size={12} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditAsset(a)}
                    className="bg-muted hover:bg-accent text-muted-foreground hover:text-foreground border border-border p-1 rounded-lg transition-colors cursor-pointer"
                    title="Audit / History"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteAsset(a)}
                    className="bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 p-1 rounded-lg transition-colors cursor-pointer"
                    title="Delete asset"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Asset Audit / Details Sidebar */}
      <Drawer open={!!auditAsset} onClose={() => setAuditAsset(null)} title={auditAsset ? `Asset Details: ${auditAsset.id}` : 'Asset Details'}>
        {auditAsset && (
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-base font-bold text-foreground">{auditAsset.model}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{auditAsset.id} · {auditAsset.type}</div>
            </div>

            <div className="bg-muted/50 border border-border rounded-xl p-4 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Asset Specifications & Details</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Asset ID</span>
                  <span className="font-semibold text-primary">{auditAsset.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Type</span>
                  <span className="font-semibold text-foreground">{auditAsset.type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Model</span>
                  <span className="font-semibold text-foreground">{auditAsset.model}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Serial Number</span>
                  <span className="font-mono text-foreground">{auditAsset.serialNo || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Status</span>
                  <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap ${ASSET_STATUS_COLOR[auditAsset.status]}`}>
                    {auditAsset.status}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Approval Status</span>
                  <span className="capitalize font-semibold text-foreground">
                    {auditAsset.approvalStatus ? auditAsset.approvalStatus.replace('_', ' ') : 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Assigned To</span>
                  <span className="font-semibold text-foreground">{auditAsset.assignedTo || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Department</span>
                  <span className="font-semibold text-foreground">{auditAsset.department || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Purchase Date</span>
                  <span className="font-semibold text-foreground">{auditAsset.purchaseDate || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Warranty Until</span>
                  <span className="font-semibold text-foreground">{auditAsset.warrantyEnd || '—'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-[11px]">Hard Disk</span>
                  <span className="font-semibold text-foreground">{auditAsset.hardDisk || '—'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-[11px]">Components Changes</span>
                  <span className="font-semibold text-foreground whitespace-pre-wrap">{auditAsset.componentsChanges || '—'}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Asset Allocation History</h4>
              {auditAsset.history?.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {auditAsset.history.map((entry, i) => (
                    <li key={i} className="text-xs bg-muted border border-border rounded-lg p-2.5">
                      <span className="text-muted-foreground">{entry.date}:</span> <span className="text-foreground">{entry.event}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No allocation history logged.</p>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <AssetFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialAsset={editingAsset}
        nextId={`AST-${1000 + assets.length + 1}`}
      />

      <Modal
        open={!!deleteAsset}
        onClose={() => setDeleteAsset(null)}
        title="Delete asset?"
        description={deleteAsset ? `${deleteAsset.id} — ${deleteAsset.model} will be removed from inventory.` : undefined}
      >
        {deleteAsset && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Delete <span className="font-semibold text-foreground">{deleteAsset.id} — {deleteAsset.model}</span>?
              This can be undone right after, but not once you navigate away.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteAsset(null)}
                className="px-4 py-2 rounded-lg bg-muted hover:bg-accent text-xs font-semibold text-muted-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteAsset.id)}
                className="px-4 py-2 rounded-lg bg-destructive hover:bg-destructive/90 text-xs font-semibold text-destructive-foreground transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Monday-anchored week bucket — real reporting weeks, not fabricated ones.
function weekStart(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}
function weekLabel(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ReportsView() {
  const { tickets } = useTickets();
  const itTickets = useMemo(() => tickets.filter((t) => t.dept === 'IT'), [tickets]);
  const resolved = useMemo(
    () => itTickets.filter((t) => (t.status === 'Resolved' || t.status === 'Closed') && t.submittedAt && t.updatedAt),
    [itTickets]
  );

  const slaPct = itTickets.length ? Math.round((resolved.length / itTickets.length) * 100) : null;
  const avgResolutionHours = resolved.length
    ? resolved.reduce((s, t) => s + (new Date(t.updatedAt) - new Date(t.submittedAt)) / 3600000, 0) / resolved.length
    : null;
  const openCount = itTickets.length - resolved.length;

  // Last 6 real calendar weeks, oldest first — zero-filled where nothing
  // happened rather than fabricated, same as a bank statement showing a
  // $0 day instead of skipping it.
  const weeks = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => weekStart(new Date(now.getTime() - (5 - i) * 7 * 86400000)));
  }, []);

  const weeklyVolume = useMemo(() => {
    return weeks.map((wStart) => {
      const wEnd = new Date(wStart.getTime() + 7 * 86400000);
      const raisedThisWeek = itTickets.filter((t) => {
        if (!t.submittedAt) return false;
        const d = new Date(t.submittedAt);
        return d >= wStart && d < wEnd;
      });
      return {
        week: weekLabel(wStart),
        resolved: raisedThisWeek.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length,
        open: raisedThisWeek.filter((t) => t.status !== 'Resolved' && t.status !== 'Closed').length,
      };
    });
  }, [weeks, itTickets]);
  const hasWeeklyVolume = weeklyVolume.some((w) => w.resolved + w.open > 0);

  const resolutionTrend = useMemo(() => {
    return weeks.map((wStart) => {
      const wEnd = new Date(wStart.getTime() + 7 * 86400000);
      const resolvedThisWeek = resolved.filter((t) => {
        const d = new Date(t.updatedAt);
        return d >= wStart && d < wEnd;
      });
      const avgHours = resolvedThisWeek.length
        ? resolvedThisWeek.reduce((s, t) => s + (new Date(t.updatedAt) - new Date(t.submittedAt)) / 3600000, 0) / resolvedThisWeek.length
        : 0;
      return { week: weekLabel(wStart), avgHours: Math.round(avgHours * 10) / 10 };
    });
  }, [weeks, resolved]);
  const hasResolutionTrend = resolutionTrend.some((w) => w.avgHours > 0);

  const resolutionByCategory = useMemo(() => {
    const byCategory = {};
    resolved.forEach((t) => {
      const key = t.category || 'Other';
      const hours = (new Date(t.updatedAt) - new Date(t.submittedAt)) / 3600000;
      if (!byCategory[key]) byCategory[key] = { total: 0, count: 0 };
      byCategory[key].total += hours;
      byCategory[key].count += 1;
    });
    return Object.entries(byCategory)
      .map(([category, { total, count }]) => ({ category, count, avgHours: Math.round((total / count) * 10) / 10 }))
      .sort((a, b) => b.avgHours - a.avgHours);
  }, [resolved]);

  function exportCsv() {
    const headers = ['Week', 'Resolved', 'Open', 'Avg Resolution (hrs)'];
    const rows = weeks.map((wStart, i) => [weekLabel(wStart), weeklyVolume[i].resolved, weeklyVolume[i].open, resolutionTrend[i].avgHours]);
    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'it-sla-report.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Reports & Logs</h1>
          <p className="text-xs text-muted-foreground">SLA compliance and resolution velocity, last 6 weeks</p>
        </div>
        <div className="flex items-center gap-2.5">
          <ItDatePicker />
          <button
            type="button"
            onClick={exportCsv}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard icon={ShieldCheck} label="SLA Compliance" value={slaPct === null ? '—' : `${slaPct}%`} sub="resolved of raised" accent="#10b981" />
        <StatCard icon={CheckCircle2} label="Tickets Resolved" value={resolved.length} sub="all time" accent="#3b82f6" />
        <StatCard icon={AlertTriangle} label="Still Open" value={openCount} sub="not yet resolved" accent="#ef4444" />
        <StatCard icon={Clock} label="Avg Resolution" value={avgResolutionHours === null ? '—' : `${avgResolutionHours.toFixed(1)}h`} sub="mean time to resolve" accent="#f97316" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BarChartCard
          title="Weekly Ticket Volume"
          subtitle="Resolved vs still-open, by week raised"
          data={hasWeeklyVolume ? weeklyVolume : []}
          xKey="week"
          stacked
          series={[
            { key: 'resolved', label: 'Resolved', color: 'hsl(var(--success))' },
            { key: 'open', label: 'Open', color: 'hsl(var(--destructive))' },
          ]}
        />

        <LineChartCard
          title="Resolution Time Trend"
          subtitle="Mean hours to resolve, by week resolved"
          data={hasResolutionTrend ? resolutionTrend : []}
          xKey="week"
          unit="h"
          series={[{ key: 'avgHours', label: 'Avg hours', color: 'hsl(var(--primary))' }]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <SectionHeader title="Resolution Time by Category" subtitle="Average hours to close" />
          {resolutionByCategory.length === 0 ? (
            <p className="text-xs text-muted-foreground py-10 text-center">No resolved tickets yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {resolutionByCategory.map((c) => {
                const maxHours = Math.max(...resolutionByCategory.map((r) => r.avgHours));
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-40 shrink-0 truncate">{c.category}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-warning rounded-full"
                        style={{ width: `${maxHours ? (c.avgHours / maxHours) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground w-12 text-right shrink-0">{c.avgHours}h</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// Read-only for IT — Production owns adding jobs and marking them complete
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
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className={inputClass}
            >
              {['Queue', 'Pending', 'On Hold', 'Completed'].map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Assigned Artist / Engineer">
          <select
            value={form.personName}
            onChange={(e) => setForm((f) => ({ ...f, personName: e.target.value }))}
            className={inputClass}
          >
            {['Sameer Kulkarni', 'Priya Nair', 'John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'Robert Brown', 'Unassigned'].map((emp) => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>
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

function RenderingStatusView() {
  const { renders, addRender, updateRenderField } = useRenders();
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
              render: (r) => <span className="text-muted-foreground text-xs whitespace-nowrap">{r.date || '—'}</span>,
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
                <select
                  value={r.personName || 'Unassigned'}
                  onChange={(e) => updateRenderField && updateRenderField(r.id, 'personName', e.target.value)}
                  aria-label={`Assigned employee for render job ${r.id}`}
                  className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  {['Kapil Chauhan', 'Tilottama Paramanik', 'Vipin', 'Himanshu', 'Kanhu', 'Sonali Das', 'Debashish Das', 'Unassigned'].map((emp) => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
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
                <select
                  value={r.status || 'Queue'}
                  onChange={(e) => updateRenderField && updateRenderField(r.id, 'status', e.target.value)}
                  aria-label={`Status for render job ${r.id}`}
                  className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  {['Completed', 'Pending', 'On Hold', 'Queue'].map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  const { approvals, submitApproval } = useApprovals();
  const itPendingFounder = approvals.filter((a) => a.source === 'IT' && a.status === 'pending_founder').length;
  const { assets } = useAssets();

  // Data Requests state
  const [dataRequests, setDataRequests] = useState([
    { id: 1, path: 'Server 70  →  Server 131', name: 'Project Data', status: 'In Progress' },
    { id: 2, path: 'Server 50  →  Server 70', name: 'Backup Files', status: 'Completed' },
    { id: 3, path: 'Server 29  →  Server 131', name: 'Client Records', status: 'Open' },
    { id: 4, path: 'Anima  →  Server 70', name: 'Media Files', status: 'In Progress' },
    { id: 5, path: 'Server 131  →  Anima', name: 'Reports', status: 'Waiting Approval' },
  ]);

  // Certain servers carry a standing rule about who signs off, or what tag
  // the request should always carry — set once here rather than left for
  // whoever fills the form to remember every time.
  function routingFor(server) {
    if (server === 'Server 100') return { approver: "Payel Ma'am (HR Manager)" };
    if (server === 'Server 121') return { approver: 'Rathish sir (Founder)' };
    if (server === 'Server 70') return { tag: 'Priority Wise' };
    if (server === 'Server 50') return { tag: 'Tag Every Time' };
    if (server === 'Server 131') return { tag: 'Standard Queue' };
    return {};
  }

  // Awaited by the modal — when the request needs a named approver, the
  // linked approval record is a real backend write (submitApproval now
  // rethrows on failure) and must succeed before this reports success;
  // otherwise the local request list would show "Waiting Approval" with no
  // approval ever created for the approver to see.
  async function handleNewDataRequest(req) {
    const rule = routingFor(req.source).approver || routingFor(req.source).tag
      ? routingFor(req.source)
      : routingFor(req.destination);
    const targetApprover = rule.approver || null;
    const serverTag = rule.tag || null;
    const status = targetApprover ? 'Waiting Approval' : req.status || 'Waiting Approval';

    if (targetApprover) {
      await submitApproval({
        title: `Data Transfer Approval: ${req.folder || 'Data Copy'}`,
        sub: `${req.source} → ${req.destination} · Approver: ${targetApprover}`,
        requestedBy: req.requesterName || 'IT Desk',
        priority: req.priority === 'Critical' ? 'high' : (req.priority || 'medium').toLowerCase(),
        category: 'Data Transfer',
      });
    }

    setDataRequests((prev) => [
      {
        id: Date.now(),
        path: `${req.source}  →  ${req.destination}`,
        name: req.folder || 'Data Copy',
        status,
        requesterName: req.requesterName,
        requesterNumber: req.requesterNumber,
        backupName: req.backupName,
        priority: req.priority,
        purpose: req.purpose,
        targetApprover,
        serverTag,
      },
      ...prev,
    ]);

    toast.success('Data transfer requested', {
      description: targetApprover ? `Routed to ${targetApprover} for approval.` : `${req.source} → ${req.destination}`,
    });
  }

  // Status changes are the most-repeated action in the queue, so the toast
  // stays terse and carries an Undo instead of a description.
  function changeTicketStatusWithUndo(id, status) {
    const before = recentTickets.find((t) => t.id === id);
    changeTicketStatus(id, status);
    toast.success(`${before?.token || 'Ticket'} → ${status}`, {
      action: before ? { label: 'Undo', onClick: () => changeTicketStatus(id, before.status) } : undefined,
    });
  }

  // Shared with the Employee dashboard — a ticket raised there appears
  // here immediately, and a status change made here reflects there too.
  const { tickets: recentTickets, changeStatus: changeTicketStatus, updateTicketField, hasMoreTickets, loadMoreTickets, loadingMore: loadingMoreTickets } = useTickets();

  // Donut chart data — derived from the live IT ticket list rather than
  // hard-coded, same reasoning as statusData below: it should actually move
  // as tickets come and go instead of always reading "248 total".
  const CATEGORY_COLOR = {
    'Laptop / Desktop / Server': 'hsl(var(--chart-1))',
    Networking: 'hsl(var(--chart-2))',
    'Software Requests': 'hsl(var(--chart-3))',
    VPN: 'hsl(var(--chart-4))',
  };
  const categoryData = useMemo(() => {
    const itTickets = recentTickets.filter((t) => t.dept === 'IT');
    const counts = {};
    itTickets.forEach((t) => {
      const key = t.category || 'Other';
      counts[key] = (counts[key] || 0) + 1;
    });
    const total = itTickets.length || 1;
    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      percent: Math.round((value / total) * 100),
      color: CATEGORY_COLOR[label] || 'hsl(var(--chart-5))',
    }));
  }, [recentTickets]);
  const categoryTotal = recentTickets.filter((t) => t.dept === 'IT').length;

  // Resolved + Closed against everything raised — the closest real proxy to
  // "SLA compliance" available without a per-ticket due-date/SLA field to
  // measure against. Shows a dash rather than a misleading 0%/100% when
  // there's no ticket history yet to compute from.
  const slaCompliance = useMemo(() => {
    if (recentTickets.length === 0) return null;
    const met = recentTickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;
    return Math.round((met / recentTickets.length) * 100);
  }, [recentTickets]);

  // Derived from the live ticket list rather than hard-coded. The previous
  // fixed figures summed to 174%, which the old hand-rolled donut rendered as
  // overlapping arcs — and they never moved when a ticket changed status.
  const statusData = useMemo(() => {
    const tone = {
      Open: 'hsl(var(--chart-1))',
      'In Progress': 'hsl(var(--chart-2))',
      'Waiting Approval': 'hsl(var(--chart-6))',
      Resolved: 'hsl(var(--chart-5))',
      Closed: 'hsl(var(--chart-1))',
    };
    return TICKET_STATUSES.map((s) => ({
      label: s,
      value: recentTickets.filter((t) => t.status === s).length,
      color: tone[s],
    })).filter((d) => d.value > 0);
  }, [recentTickets]);

  const searchIndex = useMemo(
    () => [
      ...recentTickets.map((t) => ({ group: 'Tickets', label: `${t.token}: ${t.title}`, sub: `${t.user} · ${t.status}`, tab: 'tickets' })),
      ...approvals.filter((a) => a.source === 'IT').map((a) => ({ group: 'Approvals', label: a.title, sub: `${a.requestedBy} · ${a.status}`, tab: 'approval' })),
      ...dataRequests.map((d) => ({ group: 'Data Requests', label: d.path, sub: `${d.name} · ${d.status}`, tab: 'datarequests' })),
    ],
    [recentTickets, approvals, dataRequests]
  );

  return (
    <ItDeskLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      searchIndex={searchIndex}
      role="it"
      approvalCount={itPendingFounder}
    >
      {activeTab === 'dashboard' && (
        <div className="w-full flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1">IT Service Desk</h1>
              <p className="text-xs text-muted-foreground">Overview of active tickets, pending approvals, and IT infrastructure.</p>
            </div>
            <ItDatePicker />
          </div>

          {/* Key Stat Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <StatCard label="Total Tickets" value={recentTickets.length} sub="all tickets" />
            <StatCard label="Open Tickets" value={recentTickets.filter((t) => t.status === 'Open').length} sub="active" />
            <StatCard label="Pending Approval" value={itPendingFounder} sub="awaiting founder" />
            <StatCard label="Resolved Tickets" value={recentTickets.filter((t) => t.status === 'Resolved').length} sub="completed" />
            <StatCard label="In Progress" value={recentTickets.filter((t) => t.status === 'In Progress').length} sub="working" />
            <StatCard label="SLA Compliance" value={slaCompliance === null ? '—' : `${slaCompliance}%`} sub="resolved of raised" />
          </div>

          {/* Donut Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <DonutChart title="Tickets by Category" total={categoryTotal} data={categoryData} />
            <DonutChart title="Tickets by Status" total={recentTickets.length} data={statusData} />
          </div>

          {/* Assets Overview */}
          <Card className="!p-3.5">
            <SectionHeader
              title="Assets Overview"
              action={
                <button
                  type="button"
                  onClick={() => setActiveTab('assets')}
                  className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                >
                  View All
                </button>
              }
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-center mb-2.5">
              {ASSET_TYPES.map((type) => {
                const Icon = ASSET_TYPE_ICON[type];
                return (
                  <div key={type} className="p-2 rounded-xl bg-muted border border-border">
                    <Icon size={16} className="mx-auto text-muted-foreground mb-0.5" />
                    <div className="text-xs text-muted-foreground">{type}s</div>
                    <div className="text-xs font-bold text-foreground mt-0.5">
                      {assets.filter((a) => a.type === type).length}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'tickets' && (
        <TicketsQueueView
          tickets={recentTickets}
          onStatusChange={changeTicketStatusWithUndo}
          onFieldChange={updateTicketField}
          hasMoreTickets={hasMoreTickets}
          loadMoreTickets={loadMoreTickets}
          loadingMoreTickets={loadingMoreTickets}
        />
      )}

      {activeTab === 'approval' && <ApprovalCenterView />}

      {activeTab === 'datarequests' && (
        <DataRequestsView requests={dataRequests} onNewRequest={() => setIsDataModalOpen(true)} />
      )}

      {activeTab === 'assets' && <AssetsView />}

      {activeTab === 'reports' && <ReportsView />}

      {activeTab === 'renderstatus' && <RenderingStatusView />}

      {/* Modals */}
      <DataTransferModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onSubmitSuccess={handleNewDataRequest}
      />
    </ItDeskLayout>
  );
}
