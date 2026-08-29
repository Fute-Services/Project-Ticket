import { useEffect, useState } from 'react';
import { Card, SectionHeader } from './ui';
import { getMyLeaveSummary, getMyPerformance } from '../utils/api';

const CATEGORY_LABELS = {
  walkthrough: '3D Walkthrough',
  floorPlan: 'Floor Plan',
  masterplan: 'Masterplan',
  views3d: '3D Views',
};

// Employee's Own Leave & Performance — self-scoped reads (see myLeaveSummary
// /myPerformance in hrDeskController.js), reusing the same Taken/Remaining
// math Directory.jsx already runs for HR, just for the logged-in employee.
export default function MyLeavePerformanceCard() {
  const [leave, setLeave] = useState(null);
  const [performance, setPerformance] = useState(null);

  // Polls rather than fetching once — HR can edit "Taken" (see Directory.jsx's
  // Leave card) at any time, and this card should reflect that without the
  // employee needing to reload the page.
  useEffect(() => {
    function refresh() {
      getMyLeaveSummary().then(({ data }) => setLeave(data)).catch(() => setLeave((cur) => cur || { entitlement: 0, takenYear: 0, remaining: 0 }));
      getMyPerformance().then(({ data }) => setPerformance(data)).catch(() => setPerformance((cur) => cur || []));
    }
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, []);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthEntries = (performance || []).filter((p) => p.periodKey?.startsWith(thisMonth));

  return (
    <Card>
      <SectionHeader title="My Leave & Performance" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Leave</div>
          {leave === null ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              <div className="rounded-xl bg-muted border border-border p-2 text-center">
                <div className="text-base font-bold text-foreground">{leave.entitlement}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</div>
              </div>
              <div className="rounded-xl bg-muted border border-border p-2 text-center">
                <div className="text-base font-bold text-foreground">{leave.takenYear}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Taken</div>
              </div>
              <div className="rounded-xl bg-muted border border-border p-2 text-center">
                <div className="text-base font-bold text-primary">{leave.remaining}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Remaining</div>
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Performance (this month)</div>
          {performance === null ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : monthEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">No performance entries recorded for this month yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {monthEntries.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted border border-border text-xs">
                  <span className="text-foreground font-medium">{CATEGORY_LABELS[p.category] || p.category}</span>
                  <span className="text-muted-foreground">{p.delivered || 0} / {p.target || 0} delivered</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
