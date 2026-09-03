import { useMemo } from 'react';
import SalesLayout from '../../components/sales/SalesLayout';
import { Card, SectionHeader, EmptyState } from '../../components/ui';
import { BarChartCard, LineChartCard } from '../../components/charts';
import { LOST_REASON_VALUES } from '../../components/sales/LeadProfileModal';
import { useSalesDesk } from '../../context/SalesDeskContext';

// Everything Overview already computes (funnel, leaderboard), plus what's
// specifically a "look back over time" view: conversion trend and win/loss
// reasons - Overview stays the live at-a-glance page, this is the digging-in page.
export default function Reports() {
  const { leads } = useSalesDesk();

  const conversionTrend = useMemo(() => {
    // Bucket every logged call by week, count how many outcomes in that
    // week were a positive step (Contacted or better) vs total calls logged.
    const byWeek = {};
    leads.forEach((l) => {
      (l.callLog || []).forEach((c) => {
        const d = new Date(c.at);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toISOString().slice(0, 10);
        byWeek[key] = byWeek[key] || { week: key, calls: 0, positive: 0 };
        byWeek[key].calls += 1;
        if (c.outcome && !['Did Not Pick', 'Invalid', 'Not Interested', 'Lost'].includes(c.outcome)) byWeek[key].positive += 1;
      });
    });
    return Object.values(byWeek).sort((a, b) => a.week.localeCompare(b.week)).slice(-12);
  }, [leads]);

  const lostReasons = useMemo(() => {
    const counts = {};
    leads.filter((l) => l.status === 'Lost').forEach((l) => {
      const r = l.lostReason || 'Not recorded';
      counts[r] = (counts[r] || 0) + 1;
    });
    return LOST_REASON_VALUES.concat('Not recorded')
      .map((r) => ({ reason: r, count: counts[r] || 0 }))
      .filter((r) => r.count > 0);
  }, [leads]);

  const repRevenue = useMemo(() => {
    const byRep = {};
    leads.filter((l) => l.status === 'Converted' && l.assignedTo).forEach((l) => {
      byRep[l.assignedTo] = (byRep[l.assignedTo] || 0) + (Number(l.dealValue) || 0);
    });
    return Object.entries(byRep).map(([rep, revenue]) => ({ rep, revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [leads]);

  // Marketing Master Sheet breakdowns (docs/SALES_FILTERS_IMPLEMENTATION_PLAN.md)
  // - only meaningful once that import has actually run, so each chart
  // quietly has nothing to show rather than erroring on leads without these fields.
  const leadsByCity = useMemo(() => {
    const counts = {};
    leads.forEach((l) => {
      if (!l.city) return;
      counts[l.city] = (counts[l.city] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [leads]);

  const countrySplit = useMemo(() => {
    const counts = { India: 0, Australia: 0 };
    leads.forEach((l) => {
      const c = l.country || 'India';
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([country, count]) => ({ country, count }))
      .filter((r) => r.count > 0);
  }, [leads]);

  function channelFunnel(field, order) {
    const counts = {};
    leads.forEach((l) => {
      const v = l[field];
      if (!v) return;
      counts[v] = (counts[v] || 0) + 1;
    });
    return order.map((stage) => ({ stage, count: counts[stage] || 0 })).filter((r) => r.count > 0);
  }
  const emailFunnel = useMemo(
    () => channelFunnel('emailCampaignStatus', ['Not Sent', 'Sent', 'Both Done', 'Got Response', 'Bounced']),
    [leads]
  );
  const whatsappFunnel = useMemo(
    () => channelFunnel('whatsappCampaignStatus', ['Not Started', 'Going On', 'No Response', 'Done']),
    [leads]
  );
  const linkedinFunnel = useMemo(
    () => channelFunnel('linkedinCampaignStatus', ['Not Started', '1st Msg Sent', 'Follow-up Done']),
    [leads]
  );
  const hasMarketingMasterData = leadsByCity.length > 0;

  return (
    <SalesLayout>
      <div className="flex flex-col gap-6 w-full">
        <SectionHeader title="Reports" subtitle="Trends and breakdowns over time" />

        <BarChartCard
          title="Revenue Closed by Rep"
          subtitle="Sum of deal value on Converted leads"
          data={repRevenue}
          xKey="rep"
          series={[{ key: 'revenue', label: 'Revenue (₹)', color: 'hsl(var(--primary))' }]}
        />

        {hasMarketingMasterData && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BarChartCard
                title="Leads by City"
                subtitle="Top 12 cities by contact count"
                data={leadsByCity}
                xKey="city"
                series={[{ key: 'count', label: 'Contacts', color: 'hsl(var(--primary))' }]}
              />
              <BarChartCard
                title="India vs Australia"
                subtitle="Contact count by market"
                data={countrySplit}
                xKey="country"
                series={[{ key: 'count', label: 'Contacts', color: 'hsl(var(--primary))' }]}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <BarChartCard
                title="Email Campaign"
                subtitle="Where each contact stands"
                data={emailFunnel}
                xKey="stage"
                series={[{ key: 'count', label: 'Contacts', color: 'hsl(var(--primary))' }]}
              />
              <BarChartCard
                title="WhatsApp Campaign"
                subtitle="Where each contact stands"
                data={whatsappFunnel}
                xKey="stage"
                series={[{ key: 'count', label: 'Contacts', color: 'hsl(var(--primary))' }]}
              />
              <BarChartCard
                title="LinkedIn Campaign"
                subtitle="Where each contact stands"
                data={linkedinFunnel}
                xKey="stage"
                series={[{ key: 'count', label: 'Contacts', color: 'hsl(var(--primary))' }]}
              />
            </div>
          </>
        )}

        <LineChartCard
          title="Calls & Positive Outcomes by Week"
          subtitle="Last 12 weeks of logged calls"
          data={conversionTrend}
          xKey="week"
          series={[
            { key: 'calls', label: 'Calls Logged', color: 'hsl(var(--muted-foreground))' },
            { key: 'positive', label: 'Positive Outcome', color: 'hsl(var(--primary))' },
          ]}
        />

        <Card>
          <h3 className="text-sm font-semibold text-foreground mb-1">Lost Reasons</h3>
          <p className="text-xs text-muted-foreground mb-4">Why Lost leads didn't convert</p>
          {lostReasons.length === 0 ? (
            <EmptyState text="No Lost leads with a reason recorded yet." />
          ) : (
            <div className="flex flex-col gap-2">
              {lostReasons.map((r) => (
                <div key={r.reason} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{r.reason}</span>
                  <span className="font-semibold text-muted-foreground">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </SalesLayout>
  );
}
