import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Settings, Plus, X } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { Card, SectionHeader, Field, inputClass } from '../components/ui';
import { getSystemSettings, updateSystemSettings } from '../utils/api';

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newHoliday, setNewHoliday] = useState('');

  useEffect(() => {
    getSystemSettings()
      .then(({ data }) => setSettings(data))
      .catch(() => toast.error('Could not load system settings'))
      .finally(() => setLoading(false));
  }, []);

  function save() {
    setSaving(true);
    updateSystemSettings(settings)
      .then(({ data }) => {
        setSettings(data);
        toast.success('Settings saved');
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Could not save settings'))
      .finally(() => setSaving(false));
  }

  function addHoliday() {
    if (!newHoliday.trim()) return;
    setSettings((s) => ({ ...s, holidays: [...(s.holidays || []), newHoliday.trim()] }));
    setNewHoliday('');
  }

  function removeHoliday(idx) {
    setSettings((s) => ({ ...s, holidays: s.holidays.filter((_, i) => i !== idx) }));
  }

  return (
    <SuperAdminLayout>
      <div className="w-full flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5 flex items-center gap-2">
            <Settings size={20} className="text-primary" />
            System Settings
          </h1>
          <p className="text-xs text-muted-foreground">
            SLA thresholds, working hours, and holidays used across the app. Everyone can read these; only Super Admin can change them.
          </p>
        </div>

        {loading || !settings ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <Card>
              <SectionHeader title="Ticket SLA thresholds" subtitle="Hours allowed before a ticket is considered overdue" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="IT tickets (hours)">
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={settings.slaHoursIt}
                    onChange={(e) => setSettings((s) => ({ ...s, slaHoursIt: Number(e.target.value) }))}
                  />
                </Field>
                <Field label="HR tickets (hours)">
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={settings.slaHoursHr}
                    onChange={(e) => setSettings((s) => ({ ...s, slaHoursHr: Number(e.target.value) }))}
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <SectionHeader title="Working hours" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start">
                  <input
                    type="time"
                    className={inputClass}
                    value={settings.workingHoursStart}
                    onChange={(e) => setSettings((s) => ({ ...s, workingHoursStart: e.target.value }))}
                  />
                </Field>
                <Field label="End">
                  <input
                    type="time"
                    className={inputClass}
                    value={settings.workingHoursEnd}
                    onChange={(e) => setSettings((s) => ({ ...s, workingHoursEnd: e.target.value }))}
                  />
                </Field>
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <SectionHeader title="Company holidays" subtitle={`${(settings.holidays || []).length} configured`} />
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="date"
                  className={inputClass}
                  value={newHoliday}
                  onChange={(e) => setNewHoliday(e.target.value)}
                />
                <button type="button" onClick={addHoliday} className="px-3 py-2 rounded-lg text-xs font-semibold bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1.5">
                  <Plus size={13} />
                  Add
                </button>
              </div>
              {(settings.holidays || []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No holidays added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {settings.holidays.map((h, idx) => (
                    <span key={h + idx} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-muted border border-border text-foreground">
                      {h}
                      <button type="button" onClick={() => removeHoliday(idx)} className="text-muted-foreground hover:text-destructive cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Card>

            <div className="lg:col-span-2 flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground transition-colors cursor-pointer"
              >
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
