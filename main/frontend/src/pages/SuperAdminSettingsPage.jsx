import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Settings, Plus, X, Bell } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { Card, SectionHeader, Field, inputClass } from '../components/ui';
import { Switch } from '../components/ui/switch';
import { getSystemSettings, updateSystemSettings, getNotificationRules, updateNotificationRules } from '../utils/api';

const NOTIFICATION_TRIGGER_LABEL = {
  it_new_complaint: 'New IT ticket submitted',
  it_status_update: 'IT ticket status changed (notifies submitter)',
  hr_new_complaint: 'New HR ticket submitted',
  hr_status_update: 'HR ticket status changed (notifies submitter)',
};
// Only "new ticket" triggers have a configurable recipient - status-update
// mail always goes to the ticket's own submitter, so there's nothing to
// override there.
const RECIPIENT_OVERRIDABLE = ['it_new_complaint', 'hr_new_complaint'];

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [notificationRules, setNotificationRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  useEffect(() => {
    Promise.all([getSystemSettings(), getNotificationRules()])
      .then(([s, r]) => {
        setSettings(s.data);
        setNotificationRules(r.data);
      })
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

  function setRuleField(trigger, field, value) {
    setNotificationRules((prev) => ({ ...prev, [trigger]: { ...prev[trigger], [field]: value } }));
  }

  function saveNotificationRules() {
    setSavingRules(true);
    updateNotificationRules(notificationRules)
      .then(({ data }) => {
        setNotificationRules(data);
        toast.success('Notification rules saved');
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Could not save notification rules'))
      .finally(() => setSavingRules(false));
  }

  function addHoliday() {
    if (!newHolidayDate || !newHolidayName.trim()) return;
    setSettings((s) => ({ ...s, holidays: [...(s.holidays || []), { date: newHolidayDate, name: newHolidayName.trim() }] }));
    setNewHolidayName('');
    setNewHolidayDate('');
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
            Working hours and holidays used across the app. Everyone can read these; only Super Admin can change them. SLA thresholds moved to the dedicated SLA Management page.
          </p>
        </div>

        {loading || !settings || !notificationRules ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
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
                  type="text"
                  placeholder="Holiday name (e.g. Diwali)"
                  className={inputClass}
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                />
                <input
                  type="date"
                  className={inputClass}
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                />
                <button type="button" onClick={addHoliday} className="px-3 py-2 rounded-lg text-xs font-semibold bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1.5 shrink-0">
                  <Plus size={13} />
                  Add
                </button>
              </div>
              {(settings.holidays || []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No holidays added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[...settings.holidays]
                    .map((h, idx) => ({ ...(typeof h === 'string' ? { date: h, name: h } : h), idx }))
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((h) => (
                      <span key={h.idx} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-muted border border-border text-foreground">
                        {h.name}
                        <span className="text-muted-foreground font-normal">· {h.date}</span>
                        <button type="button" onClick={() => removeHoliday(h.idx)} className="text-muted-foreground hover:text-destructive cursor-pointer">
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

            <Card className="lg:col-span-2">
              <SectionHeader
                title="Notification rules"
                subtitle="Ticket emails - turn a trigger off to stop sending it entirely, not just hide it in the UI"
                action={
                  <button
                    type="button"
                    disabled={savingRules}
                    onClick={saveNotificationRules}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground transition-colors cursor-pointer"
                  >
                    {savingRules ? 'Saving…' : 'Save rules'}
                  </button>
                }
              />
              <div className="flex flex-col gap-1">
                {Object.keys(NOTIFICATION_TRIGGER_LABEL).map((trigger) => {
                  const rule = notificationRules[trigger] || { enabled: true };
                  return (
                    <div key={trigger} className="flex flex-wrap items-center gap-4 px-3.5 py-3 rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center gap-2.5 min-w-[220px]">
                        <Switch
                          checked={rule.enabled !== false}
                          onCheckedChange={(v) => setRuleField(trigger, 'enabled', v)}
                          label={`Toggle ${NOTIFICATION_TRIGGER_LABEL[trigger]}`}
                        />
                        <span className="text-sm font-medium text-foreground">{NOTIFICATION_TRIGGER_LABEL[trigger]}</span>
                      </div>
                      {RECIPIENT_OVERRIDABLE.includes(trigger) && (
                        <input
                          type="email"
                          placeholder="Default recipient (env var)"
                          className={`${inputClass} max-w-[260px]`}
                          value={rule.recipientEmail || ''}
                          onChange={(e) => setRuleField(trigger, 'recipientEmail', e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
