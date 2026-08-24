import { useMemo } from 'react';
import { Clock, CheckCircle2, AlertTriangle, ShieldCheck, Download } from 'lucide-react';
import { useTickets } from '../context/TicketContext';
import ItDatePicker from './ItDatePicker';
import { BarChartCard, LineChartCard } from './charts';
import { Card, SectionHeader, StatCard } from './ui';

// Monday-anchored week bucket — real reporting weeks, not fabricated ones.
function weekStart(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}
function weekLabel(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ReportsView() {
  const { tickets } = useTickets();
  const itTickets = useMemo(() => tickets.filter((t) => t.dept === 'IT'), [tickets]);
  const resolved = useMemo(
    () => itTickets.filter((t) => (t.status === 'Resolved' || t.status === 'Closed') && t.submittedAt && t.updatedAt),
    [itTickets]
  );

  const slaPct = itTickets.length ? Math.round((resolved.length / itTickets.length) * 100) : null;
  const avgResolutionHours = resolved.length
    ? resolved.reduce((s, t) => s + (new Date(t.updatedAt) - new Date(t.submittedAt)) / 3600000, 0) / resolved.length
    : null;
  const openCount = itTickets.length - resolved.length;

  // Last 6 real calendar weeks, oldest first — zero-filled where nothing
  // happened rather than fabricated, same as a bank statement showing a
  // $0 day instead of skipping it.
  const weeks = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => weekStart(new Date(now.getTime() - (5 - i) * 7 * 86400000)));
  }, []);

  const weeklyVolume = useMemo(() => {
    return weeks.map((wStart) => {
      const wEnd = new Date(wStart.getTime() + 7 * 86400000);
      const raisedThisWeek = itTickets.filter((t) => {
        if (!t.submittedAt) return false;
        const d = new Date(t.submittedAt);
        return d >= wStart && d < wEnd;
      });
      return {
        week: weekLabel(wStart),
        resolved: raisedThisWeek.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length,
        open: raisedThisWeek.filter((t) => t.status !== 'Resolved' && t.status !== 'Closed').length,
      };
    });
  }, [weeks, itTickets]);
  const hasWeeklyVolume = weeklyVolume.some((w) => w.resolved + w.open > 0);

  const resolutionTrend = useMemo(() => {
    return weeks.map((wStart) => {
      const wEnd = new Date(wStart.getTime() + 7 * 86400000);
      const resolvedThisWeek = resolved.filter((t) => {
        const d = new Date(t.updatedAt);
        return d >= wStart && d < wEnd;
      });
      const avgHours = resolvedThisWeek.length
        ? resolvedThisWeek.reduce((s, t) => s + (new Date(t.updatedAt) - new Date(t.submittedAt)) / 3600000, 0) / resolvedThisWeek.length
        : 0;
      return { week: weekLabel(wStart), avgHours: Math.round(avgHours * 10) / 10 };
    });
  }, [weeks, resolved]);
  const hasResolutionTrend = resolutionTrend.some((w) => w.avgHours > 0);

  const resolutionByCategory = useMemo(() => {
    const byCategory = {};
    resolved.forEach((t) => {
      const key = t.category || 'Other';
      const hours = (new Date(t.updatedAt) - new Date(t.submittedAt)) / 3600000;
      if (!byCategory[key]) byCategory[key] = { total: 0, count: 0 };
      byCategory[key].total += hours;
      byCategory[key].count += 1;
    });
    return Object.entries(byCategory)
      .map(([category, { total, count }]) => ({ category, count, avgHours: Math.round((total / count) * 10) / 10 }))
      .sort((a, b) => b.avgHours - a.avgHours);
  }, [resolved]);

  function exportCsv() {
    const headers = ['Week', 'Resolved', 'Open', 'Avg Resolution (hrs)'];
    const rows = weeks.map((wStart, i) => [weekLabel(wStart), weeklyVolume[i].resolved, weeklyVolume[i].open, resolutionTrend[i].avgHours]);
    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'it-sla-report.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Reports & Logs</h1>
          <p className="text-xs text-muted-foreground">SLA compliance and resolution velocity, last 6 weeks</p>
        </div>
        <div className="flex items-center gap-2.5">
          <ItDatePicker />
          <button
            type="button"
            onClick={exportCsv}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard icon={ShieldCheck} label="SLA Compliance" value={slaPct === null ? '—' : `${slaPct}%`} sub="resolved of raised" accent="#10b981" />
        <StatCard icon={CheckCircle2} label="Tickets Resolved" value={resolved.length} sub="all time" accent="#3b82f6" />
        <StatCard icon={AlertTriangle} label="Still Open" value={openCount} sub="not yet resolved" accent="#ef4444" />
        <StatCard icon={Clock} label="Avg Resolution" value={avgResolutionHours === null ? '—' : `${avgResolutionHours.toFixed(1)}h`} sub="mean time to resolve" accent="#f97316" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BarChartCard
          title="Weekly Ticket Volume"
          subtitle="Resolved vs still-open, by week raised"
          data={hasWeeklyVolume ? weeklyVolume : []}
          xKey="week"
          stacked
          series={[
            { key: 'resolved', label: 'Resolved', color: 'hsl(var(--success))' },
            { key: 'open', label: 'Open', color: 'hsl(var(--destructive))' },
          ]}
        />

        <LineChartCard
          title="Resolution Time Trend"
          subtitle="Mean hours to resolve, by week resolved"
          data={hasResolutionTrend ? resolutionTrend : []}
          xKey="week"
          unit="h"
          series={[{ key: 'avgHours', label: 'Avg hours', color: 'hsl(var(--primary))' }]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <SectionHeader title="Resolution Time by Category" subtitle="Average hours to close" />
          {resolutionByCategory.length === 0 ? (
            <p className="text-xs text-muted-foreground py-10 text-center">No resolved tickets yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {resolutionByCategory.map((c) => {
                const maxHours = Math.max(...resolutionByCategory.map((r) => r.avgHours));
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-40 shrink-0 truncate">{c.category}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-warning rounded-full"
                        style={{ width: `${maxHours ? (c.avgHours / maxHours) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground w-12 text-right shrink-0">{c.avgHours}h</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
