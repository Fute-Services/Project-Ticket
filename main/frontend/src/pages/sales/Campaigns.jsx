import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Download, Trash2 } from 'lucide-react';
import SalesLayout from '../../components/sales/SalesLayout';
import { Card, SectionHeader, Modal, Field, inputClass, EmptyState } from '../../components/ui';
import { salesCampaignsApi, exportSalesEmailCampaign } from '../../utils/api';
import { useSalesDesk } from '../../context/SalesDeskContext';

const EMPTY_FORM = { name: '', sourceTag: '', targetCity: '', sentDate: new Date().toISOString().slice(0, 10) };

// Records only, not a mass-mailer (see docs/SALES_DESK_BUILD_PLAN.md §16) -
// the actual send is the CSV export already shipped in Part 2. This tracks
// that a campaign happened so response rate has something to measure against.
export default function Campaigns() {
  const { leads, campaigns, setCampaigns } = useSalesDesk();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const withResponseRate = useMemo(() => {
    return campaigns.map((c) => {
      const matched = c.sourceTag ? leads.filter((l) => l.source === c.sourceTag) : [];
      const responded = matched.filter((l) => l.status && l.status !== 'Yet to be Called' && l.status !== 'Invalid');
      const rate = matched.length ? Math.round((responded.length / matched.length) * 100) : null;
      return { ...c, matchedCount: matched.length, respondedCount: responded.length, rate };
    });
  }, [campaigns, leads]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await salesCampaignsApi.create(form);
      setCampaigns((rows) => [data, ...rows]);
      setAddOpen(false);
      setForm(EMPTY_FORM);
      toast.success('Campaign created');
    } catch (err) {
      toast.error('Could not create campaign', { description: err.response?.data?.error || err.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(c) {
    if (!window.confirm(`Delete "${c.name}"? This can't be undone.`)) return;
    try {
      await salesCampaignsApi.remove(c.id);
      setCampaigns((rows) => rows.filter((r) => r.id !== c.id));
    } catch (err) {
      toast.error('Could not delete campaign', { description: err.response?.data?.error || err.message });
    }
  }

  async function downloadEmailList() {
    setExporting(true);
    try {
      const { data } = await exportSalesEmailCampaign();
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sales-email-campaign.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Could not export email list', { description: err.response?.data?.error || err.message });
    } finally {
      setExporting(false);
    }
  }

  return (
    <SalesLayout>
      <div className="flex flex-col gap-6 w-full">
        <SectionHeader
          title="Campaigns"
          subtitle={`${campaigns.length} campaigns tracked`}
          action={
            <div className="flex items-center gap-2">
              <button type="button" onClick={downloadEmailList} disabled={exporting} className="flex items-center gap-2 bg-muted hover:bg-accent border border-border text-foreground text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50">
                <Download size={14} /> {exporting ? 'Exporting…' : 'Export Email List'}
              </button>
              <button type="button" onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }} className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer">
                <Plus size={14} /> New Campaign
              </button>
            </div>
          }
        />

        <Card>
          {withResponseRate.length === 0 ? (
            <EmptyState text="No campaigns yet - log one after your next email or outreach push." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {withResponseRate.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted border border-border">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-foreground truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.sourceTag || 'No source tag'} · {c.targetCity || 'All cities'} · Sent {c.sentDate}
                    </div>
                  </div>
                  <div className="text-xs text-foreground shrink-0 text-right">
                    {c.rate === null ? (
                      <span className="text-muted-foreground">No matching leads</span>
                    ) : (
                      <>
                        <div className="font-semibold">{c.rate}% response</div>
                        <div className="text-[10px] text-muted-foreground">{c.respondedCount}/{c.matchedCount} leads</div>
                      </>
                    )}
                  </div>
                  <button type="button" onClick={() => remove(c)} title="Delete campaign" className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive transition-colors cursor-pointer shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New Campaign" className="max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Campaign Name">
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="e.g. August Bangalore Email Push" />
          </Field>
          <Field label="Source Tag" hint="Matches the Source field on leads, to compute response rate">
            <input value={form.sourceTag} onChange={(e) => setForm((f) => ({ ...f, sourceTag: e.target.value }))} className={inputClass} placeholder="e.g. Campaign" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target City"><input value={form.targetCity} onChange={(e) => setForm((f) => ({ ...f, targetCity: e.target.value }))} className={inputClass} /></Field>
            <Field label="Sent Date"><input type="date" value={form.sentDate} onChange={(e) => setForm((f) => ({ ...f, sentDate: e.target.value }))} className={inputClass} /></Field>
          </div>
          <button type="submit" disabled={saving} className="mt-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60">
            {saving ? 'Creating…' : 'Create Campaign'}
          </button>
        </form>
      </Modal>
    </SalesLayout>
  );
}
