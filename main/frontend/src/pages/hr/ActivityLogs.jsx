import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, EmptyState } from '../../components/ui';
import { activityLogs } from '../../data/hrMockData';

export default function ActivityLogs() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activityLogs;
    return activityLogs.filter((l) => l.user.toLowerCase().includes(q) || l.action.toLowerCase().includes(q));
  }, [query]);

  return (
    <HrLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <SectionHeader title="Activity Logs" subtitle="Every action, tracked" />

        <Card>
          <div className="relative mb-5 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by user or action..."
              className="w-full bg-[#18181c] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e86024]"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState text="No activity matches this search." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">User</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Time</th>
                    <th className="py-3 px-3">IP</th>
                    <th className="py-3 px-3">Device</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-3 font-bold text-white">{l.user}</td>
                      <td className="py-3.5 px-3 text-gray-300">{l.action}</td>
                      <td className="py-3.5 px-3 text-gray-500">{l.time}</td>
                      <td className="py-3.5 px-3 text-gray-500">{l.ip}</td>
                      <td className="py-3.5 px-3 text-gray-500">{l.device}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </HrLayout>
  );
}
