import { useMemo, useState } from 'react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Badge, StatCard, EmptyState } from '../../components/ui';
import { Users2, UserCheck, UserX, Clock3 } from 'lucide-react';
import { employees, attendanceRecords, ATTENDANCE_STATUSES } from '../../data/hrMockData';

const TODAY = '2026-08-06';
const MONTH_DATES = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05'];

const DOT_COLOR = {
  Present: 'bg-emerald-400',
  Absent: 'bg-red-400',
  Late: 'bg-amber-400',
  'Half Day': 'bg-blue-400',
  'Work From Home': 'bg-purple-400',
};

// Working hours are derived from check-in/out rather than stored, so the
// number always matches whatever times are on the record.
function workingHours(record) {
  if (!record || record.checkIn === '-' || record.checkOut === '-') return null;
  const [inH, inM] = record.checkIn.split(':').map(Number);
  const [outH, outM] = record.checkOut.split(':').map(Number);
  const minutes = outH * 60 + outM - (inH * 60 + inM);
  if (minutes <= 0) return null;
  return minutes / 60;
}

function formatHours(hours) {
  if (hours == null) return '—';
  return `${hours.toFixed(1)}h`;
}

export default function Attendance() {
  const [selectedEmployee, setSelectedEmployee] = useState(employees[0].id);

  const todayRecords = useMemo(
    () => employees.map((e) => attendanceRecords.find((a) => a.employeeId === e.id && a.date === TODAY) || null),
    []
  );

  const counts = useMemo(() => {
    const c = { Present: 0, Absent: 0, Late: 0, 'Half Day': 0, 'Work From Home': 0 };
    todayRecords.forEach((r) => {
      if (r) c[r.status] = (c[r.status] || 0) + 1;
    });
    return c;
  }, [todayRecords]);

  const employeeHistory = attendanceRecords.filter((a) => a.employeeId === selectedEmployee);

  return (
    <HrLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <SectionHeader title="Attendance Management" subtitle={`Snapshot for ${TODAY}`} />

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={Users2} label="Total" value={employees.length} accent="#e86024" />
          <StatCard icon={UserCheck} label="Present" value={counts.Present} accent="#22c55e" />
          <StatCard icon={UserX} label="Absent" value={counts.Absent} accent="#ef4444" />
          <StatCard icon={Clock3} label="Late" value={counts.Late} accent="#f59e0b" />
          <StatCard icon={Users2} label="WFH" value={counts['Work From Home']} accent="#a855f7" />
        </div>

        <Card>
          <SectionHeader title="Today's Attendance" subtitle={TODAY} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Check In</th>
                  <th className="py-3 px-3">Check Out</th>
                  <th className="py-3 px-3">Working Hours</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {employees.map((e, i) => {
                  const r = todayRecords[i];
                  return (
                    <tr key={e.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-3 font-bold text-white">{e.name}</td>
                      <td className="py-3.5 px-3 text-gray-400">{e.department}</td>
                      <td className="py-3.5 px-3 text-gray-400">{r?.checkIn || '—'}</td>
                      <td className="py-3.5 px-3 text-gray-400">{r?.checkOut || '—'}</td>
                      <td className="py-3.5 px-3 text-gray-300 font-semibold">{formatHours(workingHours(r))}</td>
                      <td className="py-3.5 px-3">{r ? <Badge value={r.status} /> : <span className="text-gray-600">No record</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Monthly Report"
            subtitle={`Aug 2026, first 5 days · ${formatHours(
              employeeHistory.reduce((sum, r) => sum + (workingHours(r) || 0), 0)
            )} total`}
            action={
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="bg-[#18181c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#e86024] cursor-pointer"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            }
          />

          <div className="flex items-center gap-3 mb-5">
            {MONTH_DATES.map((d) => {
              const rec = employeeHistory.find((a) => a.date === d);
              return (
                <div key={d} className="flex flex-col items-center gap-1.5">
                  <div className="text-[10px] text-gray-500">{d.slice(-2)}</div>
                  <div
                    title={rec?.status || 'No record'}
                    className={`w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center ${rec ? DOT_COLOR[rec.status] + '/20' : 'bg-white/5'}`}
                  >
                    {rec && <span className={`w-2 h-2 rounded-full ${DOT_COLOR[rec.status]}`} />}
                  </div>
                </div>
              );
            })}
          </div>

          {employeeHistory.length === 0 ? (
            <EmptyState text="No attendance history for this employee." />
          ) : (
            <div className="flex flex-col gap-2">
              {employeeHistory.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#18181c] border border-white/5">
                  <span className="text-xs text-gray-300">{r.date}</span>
                  <span className="text-[10px] text-gray-500">{r.checkIn} — {r.checkOut}</span>
                  <span className="text-[10px] text-gray-400 font-semibold">{formatHours(workingHours(r))}</span>
                  <Badge value={r.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-wrap gap-3 text-[10px] text-gray-500">
          {ATTENDANCE_STATUSES.map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${DOT_COLOR[s]}`} /> {s}
            </div>
          ))}
        </div>
      </div>
    </HrLayout>
  );
}
