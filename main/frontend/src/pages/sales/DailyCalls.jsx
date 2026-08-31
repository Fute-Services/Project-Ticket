import { useMemo, useState } from 'react';
import { PhoneCall, MapPin } from 'lucide-react';
import SalesLayout from '../../components/sales/SalesLayout';
import LeadProfileModal from '../../components/sales/LeadProfileModal';
import { Card, SectionHeader, Badge, EmptyState } from '../../components/ui';
import { useSalesDesk } from '../../context/SalesDeskContext';

// The rep-facing worklist — leads due today or never called, ordered by
// priority then by whoever has waited longest. This is meant to be the
// screen a rep lives in all day; "Call Now" opens the same Lead Profile
// popup everywhere else uses, which already has a one-click Log Call box.
export default function DailyCalls() {
  const { leads } = useSalesDesk();
  const [selected, setSelected] = useState(null);

  const worklist = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const priorityRank = { Hot: 0, Warm: 1, Cold: 2 };
    return leads
      .filter((l) => {
        if (l.status === 'Converted' || l.status === 'Lost') return false;
        const dueToday = l.nextCallDate === today;
        const neverCalled = (!l.callLog || l.callLog.length === 0) && l.status === 'Yet to be Called';
        return dueToday || neverCalled;
      })
      .sort((a, b) => {
        const p = (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
        if (p !== 0) return p;
        return new Date(a.lastCalledDate || a.created_at || 0) - new Date(b.lastCalledDate || b.created_at || 0);
      });
  }, [leads]);

  return (
    <SalesLayout>
      <div className="flex flex-col gap-6 w-full">
        <SectionHeader title="Daily Calls" subtitle={`${worklist.length} calls to make today`} />

        <Card>
          {worklist.length === 0 ? (
            <EmptyState text="Nothing to call right now — you're caught up." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {worklist.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted border border-border">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-foreground truncate">{l.companyName}</span>
                      <Badge value={l.priority} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="truncate">{l.contactName || 'No contact name'}</span>
                      {l.city && <span className="flex items-center gap-1 shrink-0"><MapPin size={11} /> {l.city}</span>}
                      {l.mobile && <span className="shrink-0">{l.mobile}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                    {l.assignedTo || 'Unassigned'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(l)}
                    className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    <PhoneCall size={13} /> Call Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <LeadProfileModal lead={selected} onClose={() => setSelected(null)} />
    </SalesLayout>
  );
}
