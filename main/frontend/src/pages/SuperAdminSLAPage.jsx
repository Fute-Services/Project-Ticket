import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Timer, AlertOctagon } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { Card, SectionHeader, StatCard, EmptyState, Field, inputClass } from '../components/ui';
import { getSlaPolicies, updateSlaPolicies, getSlaCompliance } from '../utils/api';

const QUEUES = [
  { key: 'it', label: 'IT' },
  { key: 'hr', label: 'HR' },
];
const PRIORITIES = ['High', 'Medium', 'Low'];

function minutesToLabel(mins) {
  if (mins < 60) return `${mins}m`;
  if (mins % 60 === 0) return `${mins / 60}h`;
  return `${Math.round((mins / 60) * 10) / 10}h`;
}

export default function SuperAdminSLAPage() {
  const [policies, setPolicies] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([getSlaPolicies(), getSlaCompliance()])
      .then(([p, c]) => {
        setPolicies(p.data);
        setCompliance(c.data);
      })
      .catch(() => toast.error('Could not load SLA data'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function setField(queue, priority, field, value) {
    setPolicies((prev) => ({
      ...prev,
      [queue]: { ...prev[queue], [priority]: { ...prev[queue][priority], [field]: Number(value) || 0 } },
    }));
  }

  function save() {
    setSaving(true);
    updateSlaPolicies(policies)
      .then(({ data }) => {
        setPolicies(data);
        toast.success('SLA policies saved');
        return getSlaCompliance().then(({ data: c }) => setCompliance(c));
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Could not save SLA policies'))
      .finally(() => setSaving(false));
  }

  return (
    <SuperAdminLayout>
      <div className="w-full flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5 flex items-center gap-2">
            <Timer size={20} className="text-primary" />
            SLA Management
          </h1>
          <p className="text-xs text-muted-foreground">
            Response and resolution targets per priority, per queue. Compliance and breaches are computed against these.
          </p>
        </div>

        {loading || !policies || !compliance ? (
          <p className="text-xs text-muted-foreground py-4">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {QUEUES.map(({ key, label }) => (
                <Card key={key}>
                  <SectionHeader
                    title={`${label} compliance`}
                    subtitle={compliance[key].compliancePct != null ? `${compliance[key].compliancePct}% of resolved tickets met SLA` : 'No resolved tickets yet'}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard label="Compliant" value={compliance[key].compliant} />
                    <StatCard label="Breached" value={compliance[key].breached} accent={compliance[key].breached > 0 ? 'hsl(var(--destructive))' : undefined} />
                    <StatCard label="Near breach" value={compliance[key].nearBreach} accent={compliance[key].nearBreach > 0 ? 'hsl(var(--warning))' : undefined} />
                  </div>
                </Card>
              ))}
            </div>

            {QUEUES.map(({ key, label }) => (
              <Card key={key}>
                <SectionHeader title={`${label} policy`} subtitle="Response / resolution targets by priority" />
                <div className="flex flex-col gap-1">
                  {PRIORITIES.map((priority) => (
                    <div key={priority} className="flex items-center gap-4 px-3.5 py-3 rounded-lg hover:bg-accent transition-colors">
                      <span className="text-sm font-medium text-foreground w-20 shrink-0">{priority}</span>
                      <Field label="Response (minutes)">
                        <input
                          type="number"
                          min={1}
                          className={inputClass}
                          value={policies[key][priority].responseMinutes}
                          onChange={(e) => setField(key, priority, 'responseMinutes', e.target.value)}
                        />
                      </Field>
                      <Field label="Resolution (minutes)">
                        <input
                          type="number"
                          min={1}
                          className={inputClass}
                          value={policies[key][priority].resolutionMinutes}
                          onChange={(e) => setField(key, priority, 'resolutionMinutes', e.target.value)}
                        />
                      </Field>
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground transition-colors cursor-pointer"
              >
                {saving ? 'Saving…' : 'Save SLA policies'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {QUEUES.map(({ key, label }) => (
                <Card key={key}>
                  <SectionHeader title={`${label} breaches`} subtitle={`${compliance[key].breaches.length} open ticket(s) past SLA`} />
                  {compliance[key].breaches.length === 0 ? (
                    <EmptyState text="No open breaches." />
                  ) : (
                    <div className="flex flex-col gap-1">
                      {compliance[key].breaches.map((b) => (
                        <div key={b.id} className="flex items-center gap-3 px-3.5 py-3 rounded-lg border border-destructive/20 bg-destructive/5">
                          <AlertOctagon size={15} className="shrink-0 text-destructive" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground truncate">{b.token || b.id}</div>
                            <div className="text-[11px] text-muted-foreground">{b.priority} · {b.status}</div>
                          </div>
                          <span className="text-xs font-semibold text-destructive shrink-0">
                            {minutesToLabel(b.ageMinutes)} / {minutesToLabel(b.resolutionMinutes)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </SuperAdminLayout>
  );
}
