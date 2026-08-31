import { useMemo, useState } from 'react';
import SalesLayout from '../../components/sales/SalesLayout';
import LeadProfileModal from '../../components/sales/LeadProfileModal';
import { Card, SectionHeader, Badge, Pill, EmptyState } from '../../components/ui';
import { useSalesDesk } from '../../context/SalesDeskContext';

export default function Meetings() {
  const { leads } = useSalesDesk();
  const [tab, setTab] = useState('upcoming');
  const [selected, setSelected] = useState(null);

  const { upcoming, past } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const withMeeting = leads.filter((l) => l.meetingDate);
    return {
      upcoming: withMeeting.filter((l) => l.meetingDate >= today).sort((a, b) => a.meetingDate.localeCompare(b.meetingDate)),
      // "Past, no outcome yet" — a meeting that happened but the lead is
      // still sitting at Meeting Arranged is a lead quietly going cold.
      past: withMeeting.filter((l) => l.meetingDate < today && l.status === 'Meeting Arranged').sort((a, b) => b.meetingDate.localeCompare(a.meetingDate)),
    };
  }, [leads]);

  const rows = tab === 'upcoming' ? upcoming : past;

  return (
    <SalesLayout>
      <div className="flex flex-col gap-6 w-full">
        <SectionHeader title="Meetings" subtitle={`${upcoming.length} upcoming · ${past.length} awaiting an outcome`} />

        <Card>
          <div className="flex gap-2 mb-5">
            <Pill active={tab === 'upcoming'} onClick={() => setTab('upcoming')}>Upcoming ({upcoming.length})</Pill>
            <Pill active={tab === 'past'} onClick={() => setTab('past')}>Needs Outcome ({past.length})</Pill>
          </div>

          {rows.length === 0 ? (
            <EmptyState text={tab === 'upcoming' ? 'No meetings scheduled.' : 'Every past meeting has a logged outcome.'} />
          ) : (
            <div className="flex flex-col gap-2.5">
              {rows.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelected(l)}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-lg bg-muted border border-border hover:border-muted-foreground/40 transition-colors text-left cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-foreground truncate">{l.companyName}</span>
                      <Badge value={l.priority} />
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{l.contactName || 'No contact name'} · {l.assignedTo || 'Unassigned'}</div>
                  </div>
                  <div className="text-xs font-semibold text-foreground shrink-0">{l.meetingDate}</div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <LeadProfileModal lead={selected} onClose={() => setSelected(null)} />
    </SalesLayout>
  );
}
