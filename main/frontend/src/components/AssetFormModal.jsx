import { useEffect, useState } from 'react';
import { Modal, Field, inputClass } from './ui';
import { ASSET_TYPES, ASSET_STATUSES } from '../data/itMockData';

const EMPTY_FORM = {
  id: '',
  type: ASSET_TYPES[0],
  model: '',
  serialNo: '',
  assignedTo: '',
  department: '',
  purchaseDate: '',
  warrantyEnd: '',
  status: ASSET_STATUSES[0],
  hardDisk: '',
  componentsChanges: '',
  componentsList: [],
  componentsLog: [],
  history: [],
};

export default function AssetFormModal({ isOpen, onClose, onSubmit, initialAsset, nextId }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (isOpen) {
      const base = initialAsset || { ...EMPTY_FORM, id: nextId };
      setForm(base);
    }
  }, [isOpen, initialAsset, nextId]);

  function submit(e) {
    e.preventDefault();
    const prevStatus = initialAsset?.status;
    const prevHardDisk = initialAsset?.hardDisk;

    const hardDiskChanged = initialAsset && form.hardDisk !== prevHardDisk;
    const statusChanged = initialAsset && form.status !== prevStatus;
    const today = new Date().toISOString().slice(0, 10);

    const componentsLog = hardDiskChanged
      ? [{ date: today, change: `Updated hard disk for ${form.id}` }, ...(initialAsset.componentsLog || [])]
      : initialAsset?.componentsLog || [];
    const history = !initialAsset
      ? [{ date: today, event: 'Asset added to inventory' }]
      : statusChanged
      ? [{ date: today, event: `Status changed from ${prevStatus} to ${form.status}` }, ...(initialAsset.history || [])]
      : initialAsset.history || [];

    onSubmit({ ...form, componentsLog, history });
    onClose();
  }

  return (
    <Modal open={isOpen} onClose={onClose} title={initialAsset ? 'Edit Asset' : 'Add Asset'} className="max-w-3xl max-h-[85vh] overflow-y-auto p-6">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {/* Row 1: Asset ID, Type, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Asset ID">
            <input required value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} className={inputClass} disabled={!!initialAsset} />
          </Field>
          <Field label="Type">
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inputClass}>
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputClass}>
              {ASSET_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Row 2: Model, Serial No, Assigned Hard Disk */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Model">
            <input required value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Serial No">
            <input value={form.serialNo || ''} onChange={(e) => setForm((f) => ({ ...f, serialNo: e.target.value }))} className={inputClass} placeholder="e.g. SN-8921-X" />
          </Field>
          <Field label="Assigned Hard Disk">
            <input
              value={form.hardDisk || ''}
              onChange={(e) => setForm((f) => ({ ...f, hardDisk: e.target.value }))}
              placeholder="e.g. 512GB NVMe SSD"
              className={inputClass}
            />
          </Field>
        </div>

        {/* Row 3: Assigned To, Department, Purchase Date, Warranty Until */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Assigned To">
            <input value={form.assignedTo || ''} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Department">
            <input value={form.department || ''} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Purchase Date">
            <input required type="date" value={form.purchaseDate || ''} onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Warranty Until">
            <input required type="date" value={form.warrantyEnd || ''} onChange={(e) => setForm((f) => ({ ...f, warrantyEnd: e.target.value }))} className={inputClass} />
          </Field>
        </div>

        {/* Row 4: Components Changes */}
        <Field label="Components Changes" hint="Enter any hardware or component changes made to this asset">
          <textarea
            rows={2}
            value={form.componentsChanges || ''}
            onChange={(e) => setForm((f) => ({ ...f, componentsChanges: e.target.value }))}
            placeholder="e.g. Upgraded RAM to 16GB, replaced battery, swapped GPU..."
            className={`${inputClass} resize-none`}
          />
        </Field>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border mt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-5 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            {initialAsset ? 'Save Changes' : 'Add Asset'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
