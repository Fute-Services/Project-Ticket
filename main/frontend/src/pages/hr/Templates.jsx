import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Plus, Eye, Download, Pencil, Trash2, LogIn, LogOut, Upload } from 'lucide-react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Modal, Field, inputClass, EmptyState } from '../../components/ui';
import { ColorSelect } from '../../components/TicketsQueueView';
import { documentTemplatesApi } from '../../utils/api';

const CATEGORIES = ['Joining', 'Exit'];
const EMPTY_FORM = { name: '', category: 'Joining', file: null };

// Forces a download instead of letting the browser navigate to (and
// possibly just display) the signed Storage URL - matters because the
// "Download PDF" button should always save the file, while "View" opens the
// same URL in a new tab to actually look at it first.
function downloadFile(url, fileName) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'document.pdf';
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function TemplateCard({ template, onEdit, onDelete }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3.5 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-bold text-foreground truncate">{template.name}</div>
          {template.fileName && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{template.fileName}</div>}
        </div>
        <FileText size={16} className="text-primary shrink-0" />
      </div>
      <div className="flex items-center gap-1.5 mt-auto pt-1">
        <a
          href={template.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
        >
          <Eye size={12} /> View
        </a>
        <button type="button" onClick={() => downloadFile(template.fileUrl, template.fileName)} className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer">
          <Download size={12} /> Download
        </button>
        <button type="button" onClick={() => onEdit(template)} className="ml-auto p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer" aria-label={`Edit ${template.name}`}>
          <Pencil size={12} />
        </button>
        <button type="button" onClick={() => onDelete(template)} className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer" aria-label={`Delete ${template.name}`}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    documentTemplatesApi.list()
      .then(({ data }) => setTemplates(data || []))
      .catch((e) => {
        console.error('Failed to load document templates:', e.message);
        setTemplates([]);
      });
  }, []);

  const byCategory = useMemo(() => {
    const grouped = { Joining: [], Exit: [] };
    (templates || []).forEach((t) => {
      (grouped[t.category] || (grouped[t.category] = [])).push(t);
    });
    return grouped;
  }, [templates]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(template) {
    setEditing(template);
    setForm({ name: template.name, category: template.category, file: null });
    setShowForm(true);
  }

  async function submit(e) {
    e.preventDefault();
    if (!editing && !form.file) {
      toast.error('Choose a PDF to upload');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { data } = await documentTemplatesApi.update(editing.id, form);
        setTemplates((rows) => rows.map((t) => (t.id === editing.id ? { ...t, ...data } : t)));
        toast.success('Template updated');
      } else {
        const { data } = await documentTemplatesApi.create(form);
        setTemplates((rows) => [data, ...rows]);
        toast.success('Template added');
      }
      setShowForm(false);
    } catch (err) {
      toast.error('Could not save template', { description: err.response?.data?.error || err.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(template) {
    if (!window.confirm(`Delete "${template.name}"? This cannot be undone.`)) return;
    try {
      await documentTemplatesApi.remove(template.id);
      setTemplates((rows) => rows.filter((t) => t.id !== template.id));
      toast.success('Template deleted');
    } catch (err) {
      toast.error('Could not delete template', { description: err.response?.data?.error || err.message });
    }
  }

  return (
    <HrLayout>
      <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between gap-3">
          <SectionHeader title="Document Templates" subtitle="Reusable joining and exit paperwork - upload once, view or download anytime" />
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <Plus size={14} /> New Template
          </button>
        </div>

        {templates === null ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {CATEGORIES.map((cat) => (
              <Card key={cat}>
                <div className="flex items-center gap-2 mb-3.5">
                  {cat === 'Joining' ? <LogIn size={15} className="text-primary" /> : <LogOut size={15} className="text-primary" />}
                  <h3 className="text-sm font-bold text-foreground">{cat === 'Joining' ? 'Joining Documents' : 'Exit Documents'}</h3>
                  <span className="text-[10px] text-muted-foreground ml-auto">{byCategory[cat].length} template{byCategory[cat].length === 1 ? '' : 's'}</span>
                </div>
                {byCategory[cat].length === 0 ? (
                  <EmptyState text={`No ${cat.toLowerCase()} templates yet.`} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {byCategory[cat].map((t) => (
                      <TemplateCard key={t.id} template={t} onEdit={openEdit} onDelete={remove} />
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Template' : 'New Template'} className="max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Name">
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="e.g. Offer Letter" />
          </Field>
          <Field label="Category">
            <ColorSelect value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} options={CATEGORIES} />
          </Field>
          <Field label="PDF File" hint={editing ? 'Leave empty to keep the existing file' : undefined}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`${inputClass} flex items-center gap-2 text-left cursor-pointer`}
            >
              <Upload size={14} className="text-primary shrink-0" />
              <span className="truncate text-muted-foreground">
                {form.file ? form.file.name : editing ? (editing.fileName || 'Replace file...') : 'Choose a PDF...'}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
            />
          </Field>
          <button
            type="submit"
            disabled={saving}
            className="mt-1 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add template'}
          </button>
        </form>
      </Modal>
    </HrLayout>
  );
}
