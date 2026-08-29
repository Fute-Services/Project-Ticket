import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Card, SectionHeader, EmptyState } from './ui';
import { getSystemSettings } from '../utils/api';

// System/Technical — Holiday (National) tab. Reads the same
// getSystemSettings() endpoint Super Admin already writes to (working
// hours + holidays), open to any logged-in role — no new backend needed.
export default function HolidaysCard() {
  const [holidays, setHolidays] = useState(null);

  useEffect(() => {
    getSystemSettings()
      .then(({ data }) => setHolidays([...(data.holidays || [])].sort()))
      .catch(() => setHolidays([]));
  }, []);

  const upcoming = (holidays || []).filter((h) => h >= new Date().toISOString().slice(0, 10));

  return (
    <Card>
      <SectionHeader title="Holidays" subtitle={holidays ? `${upcoming.length} upcoming` : 'Loading…'} />
      {holidays === null ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : upcoming.length === 0 ? (
        <EmptyState text="No upcoming holidays configured." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {upcoming.map((h) => (
            <span key={h} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-muted border border-border text-foreground">
              <CalendarDays size={12} className="text-primary" />
              {h}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
