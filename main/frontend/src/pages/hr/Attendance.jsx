import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Badge, StatCard, EmptyState } from '../../components/ui';
import DataTable from '../../components/DataTable';
import { Users2, UserCheck, UserX, Clock3 } from 'lucide-react';
import { ATTENDANCE_STATUSES } from '../../data/hrMockData';
import { useHrDesk } from '../../context/HrDeskContext';
import { attendanceApi } from '../../utils/api';
import { ColorSelect } from '../../components/TicketsQueueView';

const ATTENDANCE_MARK_OPTIONS = ['Present', 'Absent'];

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
  const { employees, attendanceRecords, setAttendanceRecords } = useHrDesk();
  // '' rather than null — a controlled <select>'s value must be a string
  // (React warns on null: "should not be null, use '' or undefined instead").
  const [selectedEmployee, setSelectedEmployee] = useState('');

  useEffect(() => {
    setSelectedEmployee((s) => s || employees[0]?.id || '');
  }, [employees]);

  // The real current date — marking someone present/absent always writes
  // against today, not whatever date happens to be the most recent one
  // already sitting in seeded/historical records.
  const TODAY = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // History strip below still spans every date actually present in the
  // records (seeded history + whatever's been marked so far) — a fixed date
  // range drifts out of the data the moment the seed changes.
  const MONTH_DATES = useMemo(() => [...new Set(attendanceRecords.map((a) => a.date))].sort(), [attendanceRecords]);

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
    [employees, attendanceRecords, TODAY]
  );

  // Present/Absent dropdown upserts today's record: PATCH the existing one
  // if this employee already has a row for today (e.g. flipping a mistaken
  // mark), otherwise POST a fresh one. Both write through the same
  // `attendance` collection the Monthly Report history below already reads,
  // so a mark shows up there immediately via the local state update — no
  // separate "history" plumbing needed.
  async function markAttendance(employeeId, status) {
    const existing = attendanceRecords.find((a) => a.employeeId === employeeId && a.date === TODAY);
    try {
      if (existing) {
        const { data } = await attendanceApi.update(existing.id, {
          status,
          checkIn: status === 'Present' ? (existing.checkIn && existing.checkIn !== '-' ? existing.checkIn : new Date().toTimeString().slice(0, 5)) : '-',
          checkOut: status === 'Present' ? existing.checkOut : '-',
        });
        setAttendanceRecords((prev) => prev.map((a) => (a.id === existing.id ? { ...a, ...data } : a)));
      } else {
        const { data } = await attendanceApi.create({
          employeeId,
          date: TODAY,
          status,
          checkIn: status === 'Present' ? new Date().toTimeString().slice(0, 5) : '-',
          checkOut: '-',
        });
        setAttendanceRecords((prev) => [...prev, data]);
      }
    } catch (e) {
      toast.error('Could not update attendance', { description: e.response?.data?.error || e.message });
    }
  }

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
      <div className="flex flex-col gap-2 max-w-[1600px] mx-auto">
        <h1 className="text-base font-semibold text-foreground tracking-tight">Attendance Management</h1>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          <StatCard icon={Users2} label="Total" value={employees.length} accent="#e86024" />
          <StatCard icon={UserCheck} label="Present" value={counts.Present} accent="#22c55e" />
          <StatCard icon={UserX} label="Absent" value={counts.Absent} accent="#ef4444" />
          <StatCard icon={Clock3} label="Late" value={counts.Late} accent="#f59e0b" />
          <StatCard icon={Users2} label="WFH" value={counts['Work From Home']} accent="#a855f7" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 items-start">
        <Card>
          <SectionHeader title="Today's Attendance" subtitle={TODAY} />
          <DataTable
            rows={todayRows}
            pageSize={6}
            maxHeight="none"
            emptyMessage="No employees on record yet."
            columns={[
              { key: 'name', label: 'Employee', render: (r) => <span className="font-bold text-foreground">{r.name}</span> },
              { key: 'department', label: 'Department', render: (r) => <span className="text-muted-foreground">{r.department}</span> },
              // Commented out for now — check-in/check-out isn't reliably
              // captured yet (no real check-out flow), revisit later.
              // { key: 'checkIn', label: 'Check In', render: (r) => <span className="text-muted-foreground">{r.checkIn}</span> },
              // { key: 'checkOut', label: 'Check Out', render: (r) => <span className="text-muted-foreground">{r.checkOut}</span> },
              {
                key: 'status',
                label: 'Present / Absent',
                sortable: false,
                width: '150px',
                render: (r) => (
                  <ColorSelect
                    value={r.status || 'Absent'}
                    onChange={(value) => markAttendance(r.id, value)}
                    options={ATTENDANCE_MARK_OPTIONS}
                    ariaLabel={`Mark attendance for ${r.name}`}
                    textColorClass={
                      (r.status || 'Absent') === 'Present'
                        ? 'text-emerald-500 hover:text-emerald-400 [&>svg]:text-emerald-500'
                        : 'text-red-500 hover:text-red-400 [&>svg]:text-red-500'
                    }
                  />
                ),
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
              <div className="w-48">
                <ColorSelect
                  value={selectedEmployee}
                  onChange={setSelectedEmployee}
                  options={employees.map((e) => ({ value: e.id, label: e.name }))}
                  ariaLabel="Show monthly attendance for employee"
                />
              </div>
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
                  {/* <span className="text-xs text-muted-foreground">{r.checkIn} — {r.checkOut}</span> */}
                  <span className="text-xs text-muted-foreground font-semibold">{formatHours(workingHours(r))}</span>
                  <Badge value={r.status} />
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-5 pt-4 border-t border-border">
            {ATTENDANCE_STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${DOT_COLOR[s]}`} /> {s}
              </div>
            ))}
          </div>
        </Card>
        </div>
      </div>
    </HrLayout>
  );
}
