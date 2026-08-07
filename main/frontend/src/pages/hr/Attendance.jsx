import { useMemo, useState } from 'react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Badge, StatCard, EmptyState } from '../../components/ui';
import DataTable from '../../components/DataTable';
import { Users2, UserCheck, UserX, Clock3 } from 'lucide-react';
import { employees, attendanceRecords, ATTENDANCE_STATUSES } from '../../data/hrMockData';

const TODAY = '2026-08-06';
const MONTH_DATES = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05'];

const DOT_COLOR = {
  Present: 'bg-primary',
  Absent: 'bg-destructive',
  Late: 'bg-warning',
  'Half Day': 'bg-muted',
  'Work From Home': 'bg-muted',
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

  // One flat row per employee, with today's record merged in. Flattening the
  // join here (rather than pairing two arrays by index at render time) is what
  // lets the table sort on any column without the two lists drifting apart.
  const todayRows = useMemo(
    () =>
      employees.map((e) => {
        const record = attendanceRecords.find((a) => a.employeeId === e.id && a.date === TODAY) || null;
        return {
          id: e.id,
          name: e.name,
          department: e.department,
          checkIn: record?.checkIn || '—',
          checkOut: record?.checkOut || '—',
          hours: workingHours(record),
          status: record?.status || null,
        };
      }),
    []
  );

  const counts = useMemo(() => {
    const c = { Present: 0, Absent: 0, Late: 0, 'Half Day': 0, 'Work From Home': 0 };
    todayRows.forEach((r) => {
      if (r.status) c[r.status] = (c[r.status] || 0) + 1;
    });
    return c;
  }, [todayRows]);

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
          <DataTable
            rows={todayRows}
            pageSize={10}
            emptyMessage="No employees on record yet."
            columns={[
              { key: 'name', label: 'Employee', render: (r) => <span className="font-bold text-foreground">{r.name}</span> },
              { key: 'department', label: 'Department', render: (r) => <span className="text-muted-foreground">{r.department}</span> },
              { key: 'checkIn', label: 'Check In', render: (r) => <span className="text-muted-foreground">{r.checkIn}</span> },
              { key: 'checkOut', label: 'Check Out', render: (r) => <span className="text-muted-foreground">{r.checkOut}</span> },
              {
                key: 'hours',
                label: 'Working Hours',
                render: (r) => <span className="text-muted-foreground font-semibold">{formatHours(r.hours)}</span>,
              },
              {
                key: 'status',
                label: 'Status',
                render: (r) => (r.status ? <Badge value={r.status} /> : <span className="text-muted-foreground">No record</span>),
              },
            ]}
          />
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
                className="bg-muted border border-border rounded-xl px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
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
                  <div className="text-xs text-muted-foreground">{d.slice(-2)}</div>
                  <div
                    title={rec?.status || 'No record'}
                    className={`w-8 h-8 rounded-lg border border-border flex items-center justify-center ${rec ? DOT_COLOR[rec.status] + '/20' : 'bg-muted'}`}
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
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
                  <span className="text-xs text-muted-foreground">{r.date}</span>
                  <span className="text-xs text-muted-foreground">{r.checkIn} — {r.checkOut}</span>
                  <span className="text-xs text-muted-foreground font-semibold">{formatHours(workingHours(r))}</span>
                  <Badge value={r.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
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
