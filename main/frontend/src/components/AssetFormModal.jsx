import { useEffect, useState } from 'react';
import { Modal, Field, inputClass } from './ui';
import { ASSET_TYPES, ASSET_STATUSES } from '../data/itMockData';

const EMPTY_FORM = {
  id: '',
  type: ASSET_TYPES[0],
  model: '',
  assignedTo: '',
  department: '',
  purchaseDate: '',
  warrantyEnd: '',
  status: ASSET_STATUSES[0],
};

export default function AssetFormModal({ isOpen, onClose, onSubmit, initialAsset, nextId }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (isOpen) {
      setForm(initialAsset || { ...EMPTY_FORM, id: nextId });
    }
  }, [isOpen, initialAsset, nextId]);

  function submit(e) {
    e.preventDefault();
    onSubmit(form);
    onClose();
  }

  return (
    <Modal open={isOpen} onClose={onClose} title={initialAsset ? 'Edit Asset' : 'Add Asset'}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Asset ID">
          <input required value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} className={inputClass} disabled={!!initialAsset} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
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
        <Field label="Model">
          <input required value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assigned To">
            <input value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Department">
            <input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Purchase Date">
            <input required type="date" value={form.purchaseDate} onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Warranty Until">
            <input required type="date" value={form.warrantyEnd} onChange={(e) => setForm((f) => ({ ...f, warrantyEnd: e.target.value }))} className={inputClass} />
          </Field>
        </div>
        <button type="submit" className="mt-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer">
          {initialAsset ? 'Save Changes' : 'Add Asset'}
        </button>
      </form>
    </Modal>
  );
}
