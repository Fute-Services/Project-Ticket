import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { History, Ticket, CheckSquare, UserCog } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { Card, SectionHeader, EmptyState } from '../components/ui';
import { getActivityTimeline } from '../utils/api';

const TYPE_ICON = {
  admin_action: UserCog,
  ticket_created: Ticket,
  ticket_updated: Ticket,
  approval_created: CheckSquare,
  approval_decided: CheckSquare,
};
const TYPE_COLOR = {
  admin_action: 'text-primary',
  ticket_created: 'text-muted-foreground',
  ticket_updated: 'text-warning',
  approval_created: 'text-muted-foreground',
  approval_decided: 'text-primary',
};

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function SuperAdminActivityPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActivityTimeline(150)
      .then(({ data }) => setEvents(data))
      .catch(() => toast.error('Could not load activity timeline'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SuperAdminLayout>
      <div className="w-full flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5 flex items-center gap-2">
            <History size={20} className="text-primary" />
            Activity Timeline
          </h1>
          <p className="text-xs text-muted-foreground">
            Admin actions, ticket activity, and approval decisions, merged into one chronological feed.
          </p>
        </div>

        <Card>
          <SectionHeader title="Recent activity" subtitle={`${events.length} event(s)`} />
          {loading ? (
            <p className="text-xs text-muted-foreground py-4">Loading…</p>
          ) : events.length === 0 ? (
            <EmptyState text="No activity yet." />
          ) : (
            <div className="flex flex-col gap-1">
              {events.map((e) => {
                const Icon = TYPE_ICON[e.type] || History;
                return (
                  <div key={e.id} className="flex items-start gap-3 px-3.5 py-2.5 rounded-lg hover:bg-accent transition-colors">
                    <Icon size={14} className={`shrink-0 mt-0.5 ${TYPE_COLOR[e.type] || 'text-muted-foreground'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground">
                        {e.actor && <span className="font-semibold">{e.actor}</span>}{' '}
                        <span className="text-muted-foreground">{e.label}</span>
                        {e.detail && <span className="font-medium"> - {e.detail}</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{formatWhen(e.at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
