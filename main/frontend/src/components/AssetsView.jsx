import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Clock, CheckCircle2, XCircle, Server, Monitor, Laptop, Printer, Wifi,
  Plus, Pencil, Trash2, Search, Eye,
} from 'lucide-react';
import { useApprovals } from '../context/ApprovalContext';
import { useAssets } from '../context/AssetContext';
import ItDatePicker from './ItDatePicker';
import AssetFormModal from './AssetFormModal';
import DataTable from './DataTable';
import { Card, Drawer, Modal } from './ui';
import { ASSET_TYPES } from '../data/itMockData';

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

export default function AssetsView() {
  const { approvals, submitApproval } = useApprovals();
  const { assets, addOrUpdateAsset, patchAsset, removeAsset, restoreAsset, hasMoreAssets, loadMoreAssets, loadingMore } = useAssets();
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

      {hasMoreAssets && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMoreAssets}
            disabled={loadingMore}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}

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

export { ASSET_TYPE_ICON };
