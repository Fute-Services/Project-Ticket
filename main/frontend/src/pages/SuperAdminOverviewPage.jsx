import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  LayoutDashboard, AlertTriangle, Users, Building2, UserCheck, UserX,
  Ticket, Clock, CheckCircle2, AlarmClockOff, Wrench, HeartPulse, Database, Server, ShieldAlert,
  SlidersHorizontal, ArrowUp, ArrowDown, Eye, EyeOff,
} from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { Card, SectionHeader, StatCard, EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getDashboardOverview, updateDashboardLayout } from '../utils/api';

const SEVERITY_STYLE = {
  critical: 'bg-destructive/10 border-destructive/30 text-destructive',
  warning: 'bg-warning/10 border-warning/30 text-warning',
  info: 'bg-muted border-border text-muted-foreground',
};

const WIDGET_LABEL = {
  requiresAttention: 'Requires Attention',
  organization: 'Organization',
  itHr: 'IT & HR',
  systemHealth: 'System Health',
  security: 'Security',
};
const DEFAULT_LAYOUT = Object.keys(WIDGET_LABEL).map((id) => ({ id, visible: true }));

export default function SuperAdminOverviewPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState(() => (Array.isArray(user?.dashboardLayout) && user.dashboardLayout.length ? user.dashboardLayout : DEFAULT_LAYOUT));
  const [customizing, setCustomizing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDashboardOverview()
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Could not load dashboard overview'))
      .finally(() => setLoading(false));
  }, []);

  function move(index, dir) {
    setLayout((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function toggleVisible(id) {
    setLayout((prev) => prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  }

  function saveLayout() {
    setSaving(true);
    updateDashboardLayout(layout)
      .then(() => {
        toast.success('Dashboard layout saved');
        setCustomizing(false);
      })
      .catch(() => toast.error('Could not save layout'))
      .finally(() => setSaving(false));
  }

  const widgets = useMemo(() => {
    if (!data) return {};
    return {
      requiresAttention: (
        <Card>
          <SectionHeader
            title="Requires attention"
            subtitle={data.requiresAttention.length === 0 ? 'Nothing needs attention right now.' : `${data.requiresAttention.length} item(s)`}
          />
          {data.requiresAttention.length === 0 ? (
            <EmptyState text="All clear - no SLA breaches, high-priority tickets, or pending approvals." />
          ) : (
            <div className="flex flex-col gap-2">
              {data.requiresAttention.map((item) => (
                <div key={item.key} className={`flex items-center gap-3 px-3.5 py-3 rounded-lg border ${SEVERITY_STYLE[item.severity] || SEVERITY_STYLE.info}`}>
                  <AlertTriangle size={15} className="shrink-0" />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  <span className="text-sm font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      ),
      organization: (
        <Card>
          <SectionHeader title="Organization" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Employees" value={data.organization.totalEmployees} icon={Users} />
            <StatCard label="Active" value={data.organization.activeEmployees} icon={UserCheck} />
            <StatCard label="Inactive" value={data.organization.inactiveEmployees} icon={UserX} />
            <StatCard label="Departments" value={data.organization.totalDepartments} icon={Building2} />
          </div>
        </Card>
      ),
      itHr: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <SectionHeader title="IT" subtitle={`${data.it.total} total tickets`} />
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Open" value={data.it.open} icon={Ticket} />
              <StatCard label="Pending" value={data.it.pending} icon={Clock} />
              <StatCard label="Resolved" value={data.it.resolved} icon={CheckCircle2} />
              <StatCard label="Past SLA" value={data.it.overdue} icon={AlarmClockOff} accent={data.it.overdue > 0 ? 'hsl(var(--destructive))' : undefined} />
              <StatCard label="High Priority Open" value={data.it.highPriorityOpen} icon={AlertTriangle} />
              <StatCard label="Avg Resolution" value={data.it.avgResolutionHours != null ? `${data.it.avgResolutionHours}h` : '-'} icon={Wrench} />
            </div>
          </Card>
          <Card>
            <SectionHeader title="HR" subtitle={`${data.hr.total} total tickets`} />
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Open" value={data.hr.open} icon={Ticket} />
              <StatCard label="Pending" value={data.hr.pending} icon={Clock} />
              <StatCard label="Resolved" value={data.hr.resolved} icon={CheckCircle2} />
              <StatCard label="Past SLA" value={data.hr.overdue} icon={AlarmClockOff} accent={data.hr.overdue > 0 ? 'hsl(var(--destructive))' : undefined} />
              <StatCard label="Pending Leave Requests" value={data.hr.pendingLeaveRequests} icon={HeartPulse} />
              <StatCard label="Avg Resolution" value={data.hr.avgResolutionHours != null ? `${data.hr.avgResolutionHours}h` : '-'} icon={Wrench} />
            </div>
          </Card>
        </div>
      ),
      systemHealth: (
        <Card>
          <SectionHeader title="System health" subtitle="Storage, background jobs, and integrations aren't tracked yet." />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Database" value={data.systemHealth.database.status} sub={`${data.systemHealth.database.pingMs}ms`} icon={Database} />
            <StatCard label="Server" value={data.systemHealth.server.status} sub={`up ${Math.floor(data.systemHealth.server.uptimeSeconds / 60)}m`} icon={Server} />
            <StatCard label="API" value={data.systemHealth.api.status} icon={HeartPulse} />
          </div>
        </Card>
      ),
      security: (
        <Card>
          <SectionHeader title="Security" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Active Sessions" value={data.security.activeSessions} icon={ShieldAlert} />
            <StatCard label="Failed Logins (24h)" value={data.security.failedLoginsLast24h} icon={AlarmClockOff} accent={data.security.failedLoginsLast24h > 0 ? 'hsl(var(--warning))' : undefined} />
            <StatCard label="Locked Accounts" value={data.security.lockedAccounts} icon={UserX} accent={data.security.lockedAccounts > 0 ? 'hsl(var(--destructive))' : undefined} />
          </div>
        </Card>
      ),
    };
  }, [data]);

  return (
    <SuperAdminLayout>
      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5 flex items-center gap-2">
              <LayoutDashboard size={20} className="text-primary" />
              Overview
            </h1>
            <p className="text-xs text-muted-foreground">Organization health, at a glance.</p>
          </div>
          <button
            type="button"
            onClick={() => setCustomizing((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <SlidersHorizontal size={13} /> {customizing ? 'Done' : 'Customize'}
          </button>
        </div>

        {customizing && (
          <Card>
            <SectionHeader
              title="Customize dashboard"
              subtitle="Reorder or hide sections - saved to your own account."
              action={
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveLayout}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground transition-colors cursor-pointer"
                >
                  {saving ? 'Saving…' : 'Save layout'}
                </button>
              }
            />
            <div className="flex flex-col gap-1">
              {layout.map((w, i) => (
                <div key={w.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg hover:bg-accent transition-colors">
                  <span className={`text-sm font-medium flex-1 ${w.visible ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                    {WIDGET_LABEL[w.id] || w.id}
                  </span>
                  <button type="button" onClick={() => toggleVisible(w.id)} title={w.visible ? 'Hide' : 'Show'} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
                    {w.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                    <ArrowUp size={13} />
                  </button>
                  <button type="button" disabled={i === layout.length - 1} onClick={() => move(i, 1)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                    <ArrowDown size={13} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {loading ? (
          <p className="text-xs text-muted-foreground py-4">Loading overview…</p>
        ) : !data ? (
          <EmptyState text="Could not load overview data." />
        ) : (
          layout.filter((w) => w.visible).map((w) => <div key={w.id}>{widgets[w.id]}</div>)
        )}
      </div>
    </SuperAdminLayout>
  );
}
