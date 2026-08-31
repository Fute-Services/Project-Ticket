import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, PhoneCall, CalendarCheck2, IndianRupee, AlertTriangle } from 'lucide-react';
import SalesLayout from '../../components/sales/SalesLayout';
import LeadProfileModal, { STAGES, stageForStatus } from '../../components/sales/LeadProfileModal';
import { Card, SectionHeader, StatCard, Badge } from '../../components/ui';
import DonutChart from '../../components/DonutChart';
import { useSalesDesk } from '../../context/SalesDeskContext';

const STAGE_COLORS = {
  'New leads': 'hsl(var(--chart-1, var(--primary)))',
  Contacted: 'hsl(var(--chart-2, 217 91% 60%))',
  Meeting: 'hsl(var(--chart-3, 262 83% 66%))',
  Proposal: 'hsl(var(--chart-4, 38 92% 50%))',
  Closure: 'hsl(var(--chart-5, 142 71% 45%))',
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Rebuilt to match the reference CRM's Dashboard depth (see
// docs/SALES_DESK_BUILD_PLAN.md §10) — same layout, our theme, our data.
export default function SalesOverview() {
  const { leads, settings, loading } = useSalesDesk();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const stats = useMemo(() => {
    const today = todayStr();
    const thisMonth = today.slice(0, 7);
    const callsToday = leads.reduce((sum, l) => sum + (l.callLog || []).filter((c) => c.at?.startsWith(today)).length, 0);
    const newLeadsThisMonth = leads.filter((l) => l.created_at?.startsWith(thisMonth)).length;
    const meetingsUpcoming = leads.filter((l) => l.meetingDate && l.meetingDate >= today).length;
    const meetingsCompleted = leads.filter((l) => l.meetingDate && l.meetingDate < today && l.status !== 'Meeting Arranged').length;
    const revenueClosed = leads.filter((l) => l.status === 'Converted' && l.updated_at?.startsWith(thisMonth)).reduce((s, l) => s + (Number(l.dealValue) || 0), 0);

    const overdue = leads.filter((l) => l.nextCallDate && l.nextCallDate < today && l.status !== 'Converted' && l.status !== 'Lost').length;
    const dueToday = leads.filter((l) => l.nextCallDate === today && l.status !== 'Converted' && l.status !== 'Lost').length;

    return { callsToday, newLeadsThisMonth, meetingsUpcoming, meetingsCompleted, revenueClosed, overdue, dueToday, followUps: overdue + dueToday };
  }, [leads]);

  const activeReps = useMemo(() => [...new Set(leads.map((l) => l.assignedTo).filter(Boolean))], [leads]);

  const pipelineStages = useMemo(() => {
    const active = leads.filter((l) => l.status !== 'Lost');
    return STAGES.map((stage) => {
      const stageLeads = active.filter((l) => stageForStatus(l.status) === stage);
      return { stage, count: stageLeads.length, value: stageLeads.reduce((s, l) => s + (Number(l.dealValue) || 0), 0) };
    });
  }, [leads]);
  const maxStageCount = Math.max(1, ...pipelineStages.map((s) => s.count));

  const priorityLeads = useMemo(() => {
    const today = todayStr();
    return leads
      .filter((l) => l.priority === 'Hot' && l.status !== 'Converted' && l.status !== 'Lost')
      .sort((a, b) => {
        const na = a.nextCallDate || a.meetingDate || '9999';
        const nb = b.nextCallDate || b.meetingDate || '9999';
        return na.localeCompare(nb);
      })
      .slice(0, 6);
  }, [leads]);

  const teamActivity = useMemo(() => {
    const today = todayStr();
    const target = settings.dailyCallTargetPerRep || 0;
    const byRep = {};
    activeReps.forEach((r) => { byRep[r] = 0; });
    leads.forEach((l) => {
      (l.callLog || []).forEach((c) => {
        if (c.at?.startsWith(today) && c.by) byRep[c.by] = (byRep[c.by] || 0) + 1;
      });
    });
    return Object.entries(byRep)
      .map(([rep, calls]) => ({ rep, calls, pct: target ? Math.min(100, Math.round((calls / target) * 100)) : 0 }))
      .sort((a, b) => b.calls - a.calls);
  }, [leads, activeReps, settings]);

  const todaysSchedule = useMemo(() => {
    const today = todayStr();
    const calls = leads.filter((l) => l.nextCallDate === today).map((l) => ({ id: l.id, type: 'Call', label: l.companyName, lead: l }));
    const meetings = leads.filter((l) => l.meetingDate === today).map((l) => ({ id: l.id, type: 'Meeting', label: l.companyName, lead: l }));
    return [...calls, ...meetings].slice(0, 8);
  }, [leads]);

  const monthlyClosed = stats.revenueClosed;
  const target = settings.monthlyRevenueTarget || 0;
  const remaining = Math.max(0, target - monthlyClosed);

  return (
    <SalesLayout>
      <div className="flex flex-col gap-6 w-full">
        <SectionHeader title="Dashboard" subtitle={loading ? 'Loading…' : `${leads.length} leads tracked`} />

        {stats.followUps > 0 && (
          <button
            type="button"
            onClick={() => navigate('/sales/follow-ups')}
            className="w-full text-left rounded-xl border border-warning/30 bg-warning/10 p-4 flex items-center justify-between gap-3 hover:border-warning/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-warning shrink-0" />
              <div>
                <div className="text-xs font-bold text-foreground">{stats.followUps} follow-ups need your attention</div>
                <div className="text-[11px] text-muted-foreground">{stats.overdue} are overdue and {stats.dueToday} are due today. Prioritise the hot leads first.</div>
              </div>
            </div>
            <span className="text-xs font-semibold text-primary shrink-0">View follow-ups →</span>
          </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <StatCard label="Calls Today" value={stats.callsToday} sub="calls logged today" icon={PhoneCall} />
          <StatCard label="New Leads" value={stats.newLeadsThisMonth} sub="this month" icon={Users} />
          <StatCard label="Meetings" value={stats.meetingsUpcoming} sub={`${stats.meetingsCompleted} completed`} icon={CalendarCheck2} />
          <StatCard label="Revenue Closed" value={`₹${monthlyClosed.toLocaleString('en-IN')}`} sub={target ? `of ₹${target.toLocaleString('en-IN')} target` : 'this month'} icon={IndianRupee} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-1">Sales Pipeline</h3>
            <p className="text-xs text-muted-foreground mb-4">Lead movement and deal value by stage</p>
            <div className="flex flex-col gap-2.5">
              {pipelineStages.map((s) => (
                <div key={s.stage} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-muted-foreground shrink-0 truncate">{s.stage}</div>
                  <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                    <div
                      className="h-full flex items-center justify-end px-2 rounded-md text-[10px] font-bold text-white"
                      style={{ width: `${Math.max(6, (s.count / maxStageCount) * 100)}%`, backgroundColor: STAGE_COLORS[s.stage] }}
                    >
                      {s.count}
                    </div>
                  </div>
                  <div className="w-20 text-right text-xs text-foreground font-semibold shrink-0">₹{s.value.toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>
          </Card>

          <DonutChart
            title="Monthly Target"
            total={target || monthlyClosed}
            data={[
              { label: 'Closed', value: monthlyClosed, color: 'hsl(var(--primary))' },
              { label: 'Remaining', value: remaining, color: 'hsl(var(--muted))' },
            ]}
          />
        </div>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Priority Leads</h3>
              <p className="text-xs text-muted-foreground">Hot leads, soonest activity first</p>
            </div>
            <button type="button" onClick={() => navigate('/sales/directory')} className="text-xs font-semibold text-primary hover:underline cursor-pointer">View all leads →</button>
          </div>
          {priorityLeads.length === 0 ? (
            <p className="text-xs text-muted-foreground">No Hot leads right now.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {priorityLeads.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelected(l)}
                  className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted border border-border hover:border-muted-foreground/40 transition-colors text-left cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-foreground truncate">{l.companyName}</div>
                    <div className="text-xs text-muted-foreground truncate">{l.contactName || 'No contact'} · {l.assignedTo || 'Unassigned'}</div>
                  </div>
                  <Badge value={l.status} />
                  <div className="text-xs font-semibold text-foreground w-20 text-right shrink-0">{l.dealValue > 0 ? `₹${Number(l.dealValue).toLocaleString('en-IN')}` : '—'}</div>
                  <div className="text-xs text-muted-foreground w-24 text-right shrink-0">{l.nextCallDate || l.meetingDate || '—'}</div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-4">Team Activity</h3>
            {teamActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground">No leads assigned to a rep yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {teamActivity.map((t) => (
                  <div key={t.rep}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{t.rep}</span>
                      <span className="text-muted-foreground">{t.calls} calls{settings.dailyCallTargetPerRep ? ` · ${t.pct}%` : ''}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${t.pct >= 70 || !settings.dailyCallTargetPerRep ? 'bg-primary' : 'bg-warning'}`} style={{ width: `${settings.dailyCallTargetPerRep ? t.pct : Math.min(100, t.calls * 10)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-4">Today's Schedule</h3>
            {todaysSchedule.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing scheduled for today.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {todaysSchedule.map((item, i) => (
                  <button
                    key={`${item.id}-${item.type}-${i}`}
                    type="button"
                    onClick={() => setSelected(item.lead)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left cursor-pointer"
                  >
                    <span className={`w-1.5 h-6 rounded-full shrink-0 ${item.type === 'Meeting' ? 'bg-purple-500' : 'bg-primary'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-foreground truncate">{item.type === 'Meeting' ? 'Meeting' : 'Follow-up call'}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <LeadProfileModal lead={selected} onClose={() => setSelected(null)} />
    </SalesLayout>
  );
}
