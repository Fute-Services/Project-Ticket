import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BarChart3, Users, Ticket, CheckSquare, CalendarDays, Download } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { Card, SectionHeader, StatCard, EmptyState, inputClass } from '../components/ui';
import { getAnalytics, exportAnalyticsCsv } from '../utils/api';

const ROLE_LABEL = {
  superadmin: 'Super Admin',
  founder: 'Founder',
  hr: 'HR',
  it: 'IT',
  coordinator: 'Coordinator',
  employee: 'Employee',
};

function BreakdownList({ data }) {
  const entries = Object.entries(data || {});
  if (!entries.length) return <p className="text-xs text-muted-foreground py-2">No data yet.</p>;
  return (
    <div className="flex flex-col gap-1">
      {entries.map(([key, count]) => (
        <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent transition-colors">
          <span className="text-xs font-medium text-foreground">{ROLE_LABEL[key] || key}</span>
          <span className="text-xs font-semibold text-muted-foreground">{count}</span>
        </div>
      ))}
    </div>
  );
}

export default function SuperAdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  function load() {
    setLoading(true);
    getAnalytics({ from: fromDate || undefined, to: toDate || undefined })
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Could not load analytics'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [fromDate, toDate]);

  function handleExport() {
    setExporting(true);
    exportAnalyticsCsv({ from: fromDate || undefined, to: toDate || undefined })
      .then(({ data: blob }) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Could not export CSV'))
      .finally(() => setExporting(false));
  }

  return (
    <SuperAdminLayout>
      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5 flex items-center gap-2">
              <BarChart3 size={20} className="text-primary" />
              Analytics
            </h1>
            <p className="text-xs text-muted-foreground">Cross-department snapshot. Filter by date range, or export as CSV.</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" className={inputClass} value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="From date" />
            <input type="date" className={inputClass} value={toDate} onChange={(e) => setToDate(e.target.value)} title="To date" />
            <button
              type="button"
              disabled={exporting}
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <Download size={13} /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : !data ? (
          <EmptyState text="Could not load analytics." />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Total users" value={data.users.total} sub={`${data.users.active} active`} icon={Users} />
              <StatCard label="HR tickets" value={data.tickets.hr.total} sub={data.tickets.hr.avgResolutionHours != null ? `avg ${data.tickets.hr.avgResolutionHours}h to resolve` : 'no resolved yet'} icon={Ticket} />
              <StatCard label="IT tickets" value={data.tickets.it.total} sub={data.tickets.it.avgResolutionHours != null ? `avg ${data.tickets.it.avgResolutionHours}h to resolve` : 'no resolved yet'} icon={Ticket} />
              <StatCard label="Approvals" value={data.approvals.total} sub={`${data.approvals.byStatus?.Pending || 0} pending`} icon={CheckSquare} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <Card>
                <SectionHeader title="Users by role" />
                <BreakdownList data={data.users.byRole} />
              </Card>
              <Card>
                <SectionHeader title="HR tickets by status" />
                <BreakdownList data={data.tickets.hr.byStatus} />
              </Card>
              <Card>
                <SectionHeader title="IT tickets by status" />
                <BreakdownList data={data.tickets.it.byStatus} />
              </Card>
            </div>

            <Card>
              <SectionHeader title="Leave requests" icon={CalendarDays} />
              <p className="text-sm text-foreground">{data.leave.total} total requests on file.</p>
            </Card>
          </>
        )}
      </div>
    </SuperAdminLayout>
  );
}
