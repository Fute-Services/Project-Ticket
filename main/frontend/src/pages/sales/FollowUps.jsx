import { useMemo, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import SalesLayout from '../../components/sales/SalesLayout';
import LeadProfileModal from '../../components/sales/LeadProfileModal';
import { Card, Badge, EmptyState } from '../../components/ui';
import { useSalesDesk } from '../../context/SalesDeskContext';

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

function FollowUpRow({ lead, onClick, overdueDays }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 p-3 rounded-lg bg-muted border border-border hover:border-muted-foreground/40 transition-colors text-left cursor-pointer"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-foreground truncate">{lead.companyName}</span>
          <Badge value={lead.priority} />
        </div>
        <div className="text-xs text-muted-foreground truncate">{lead.contactName || 'No contact name'} · {lead.assignedTo || 'Unassigned'}</div>
      </div>
      {overdueDays > 0 ? (
        <span className="text-xs font-semibold text-destructive shrink-0">{overdueDays}d overdue</span>
      ) : (
        <span className="text-xs text-muted-foreground shrink-0">Due today</span>
      )}
    </button>
  );
}

// Same "N overdue, N due today, prioritise hot leads first" framing as the
// reference CRM's banner — this screen is what that banner links into.
export default function FollowUps() {
  const { leads } = useSalesDesk();
  const [selected, setSelected] = useState(null);

  const { overdue, dueToday } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const priorityRank = { Hot: 0, Warm: 1, Cold: 2 };
    const due = leads.filter((l) => l.nextCallDate && l.nextCallDate <= today && l.status !== 'Converted' && l.status !== 'Lost');
    const sortFn = (a, b) => (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1) || a.nextCallDate.localeCompare(b.nextCallDate);
    return {
      overdue: due.filter((l) => l.nextCallDate < today).sort(sortFn),
      dueToday: due.filter((l) => l.nextCallDate === today).sort(sortFn),
    };
  }, [leads]);

  return (
    <SalesLayout>
      <div className="flex flex-col gap-6 w-full">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1">Follow-ups</h1>
          <p className="text-xs text-muted-foreground">
            {overdue.length} overdue and {dueToday.length} due today. Prioritise the hot leads first.
          </p>
        </div>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={15} className="text-destructive" />
            <h3 className="text-sm font-semibold text-foreground">Overdue ({overdue.length})</h3>
          </div>
          {overdue.length === 0 ? (
            <EmptyState text="Nothing overdue." />
          ) : (
            <div className="flex flex-col gap-2">
              {overdue.map((l) => (
                <FollowUpRow key={l.id} lead={l} onClick={() => setSelected(l)} overdueDays={daysBetween(l.nextCallDate, new Date().toISOString().slice(0, 10))} />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Due Today ({dueToday.length})</h3>
          </div>
          {dueToday.length === 0 ? (
            <EmptyState text="Nothing due today." />
          ) : (
            <div className="flex flex-col gap-2">
              {dueToday.map((l) => (
                <FollowUpRow key={l.id} lead={l} onClick={() => setSelected(l)} overdueDays={0} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <LeadProfileModal lead={selected} onClose={() => setSelected(null)} />
    </SalesLayout>
  );
}
