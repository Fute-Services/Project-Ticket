import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import SalesLayout from '../../components/sales/SalesLayout';
import { Card, SectionHeader, Field, inputClass } from '../../components/ui';
import { updateSalesSettings } from '../../utils/api';
import { useSalesDesk } from '../../context/SalesDeskContext';

export default function SalesSettings() {
  const { settings, setSettings, leads } = useSalesDesk();
  const [form, setForm] = useState({ monthlyRevenueTarget: '0', dailyCallTargetPerRep: '0' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      monthlyRevenueTarget: String(settings.monthlyRevenueTarget || 0),
      dailyCallTargetPerRep: String(settings.dailyCallTargetPerRep || 0),
    });
  }, [settings]);

  const reps = [...new Set(leads.map((l) => l.assignedTo).filter(Boolean))].sort();

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        monthlyRevenueTarget: Number(form.monthlyRevenueTarget) || 0,
        dailyCallTargetPerRep: Number(form.dailyCallTargetPerRep) || 0,
      };
      const { data } = await updateSalesSettings(payload);
      setSettings((s) => ({ ...s, ...data }));
      toast.success('Settings saved');
    } catch (err) {
      toast.error('Could not save settings', { description: err.response?.data?.error || err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SalesLayout>
      <div className="flex flex-col gap-6 w-full max-w-2xl">
        <SectionHeader title="Settings" subtitle="Targets used across Dashboard and Reports" />

        <Card>
          <form onSubmit={save} className="flex flex-col gap-3">
            <Field label="Monthly Revenue Target (₹)" hint="Drives the Dashboard's target donut and forecast">
              <input type="number" min="0" value={form.monthlyRevenueTarget} onChange={(e) => setForm((f) => ({ ...f, monthlyRevenueTarget: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Daily Call Target per Rep" hint="Drives Team Activity's on-track / needs-focus bars">
              <input type="number" min="0" value={form.dailyCallTargetPerRep} onChange={(e) => setForm((f) => ({ ...f, dailyCallTargetPerRep: e.target.value }))} className={inputClass} />
            </Field>
            <button type="submit" disabled={saving} className="mt-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60 w-fit px-6">
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </form>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-foreground mb-1">Active Reps</h3>
          <p className="text-xs text-muted-foreground mb-4">Derived from leads currently assigned — granting or revoking the Sales role itself happens from Super Admin's Users page.</p>
          {reps.length === 0 ? (
            <p className="text-xs text-muted-foreground">No leads assigned to a rep yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {reps.map((r) => (
                <span key={r} className="text-xs px-2.5 py-1 rounded-lg bg-muted text-foreground border border-border">{r}</span>
              ))}
            </div>
          )}
        </Card>
      </div>
    </SalesLayout>
  );
}
