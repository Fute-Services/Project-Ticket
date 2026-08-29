import { useEffect, useMemo, useState } from 'react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Badge, StatCard, EmptyState } from '../../components/ui';
import DataTable from '../../components/DataTable';
import { Users2, UserCheck, UserX, Home, Timer, CalendarOff } from 'lucide-react';
import { ATTENDANCE_STATUSES } from '../../data/hrMockData';
import { useHrDesk } from '../../context/HrDeskContext';
import { ColorSelect } from '../../components/TicketsQueueView';
import HolidaysCard from '../../components/HolidaysCard';
import { getSystemSettings } from '../../utils/api';

const DOT_COLOR = {
  Present: 'bg-primary',
  Absent: 'bg-destructive',
  Late: 'bg-warning',
  'Half Day': 'bg-muted',
  'Work From Home': 'bg-muted',
  Leave: 'bg-warning',
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
  const { employees, attendanceRecords } = useHrDesk();
  // '' rather than null — a controlled <select>'s value must be a string
  // (React warns on null: "should not be null, use '' or undefined instead").
  const [selectedEmployee, setSelectedEmployee] = useState('');
  // System/Technical — default working hours, reused from Super Admin's
  // existing settings doc (see HolidaysCard.jsx for the same source) to
  // flag a late check-in without inventing a second "start time" setting.
  const [workStart, setWorkStart] = useState(null);

  useEffect(() => {
    setSelectedEmployee((s) => s || employees[0]?.id || '');
  }, [employees]);

  useEffect(() => {
    getSystemSettings()
      .then(({ data }) => setWorkStart(data.workingHoursStart || null))
      .catch(() => setWorkStart(null));
  }, []);

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
  // Read-only — attendance is written exclusively by the employee's own
  // Check-in/Check-out widget (see CheckInWidget.jsx), never by HR here.
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
          workMode: record?.workMode || null,
        };
      }),
    [employees, attendanceRecords, TODAY]
  );

  // Present/Absent, WFH count, and today's total hours are all derived from
  // whether/how an employee checked in — nothing here is HR-editable.
  const counts = useMemo(() => {
    let present = 0;
    let onLeave = 0;
    let wfh = 0;
    let totalHours = 0;
    todayRows.forEach((r) => {
      if (r.status === 'Leave') onLeave += 1;
      else if (r.checkIn && r.checkIn !== '—') present += 1;
      if (r.workMode === 'WFH') wfh += 1;
      if (r.hours) totalHours += r.hours;
    });
    return { present, onLeave, absent: todayRows.length - present - onLeave, wfh, totalHours };
  }, [todayRows]);

  const employeeHistory = attendanceRecords.filter((a) => a.employeeId === selectedEmployee);

  return (
    <HrLayout>
      <div className="flex flex-col gap-2 max-w-[1600px] mx-auto">
        <h1 className="text-base font-semibold text-foreground tracking-tight">Attendance Management</h1>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
          <StatCard icon={Users2} label="Total" value={employees.length} accent="#e86024" />
          <StatCard icon={UserCheck} label="Present" value={counts.present} accent="#22c55e" />
          <StatCard icon={UserX} label="Absent" value={counts.absent} accent="#ef4444" />
          <StatCard icon={Home} label="WFH" value={counts.wfh} accent="#a855f7" />
          <StatCard icon={CalendarOff} label="On Leave" value={counts.onLeave} accent="#f59e0b" />
          <StatCard icon={Timer} label="Total Hours Today" value={formatHours(counts.totalHours)} accent="#38bdf8" />
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
              { key: 'checkIn', label: 'Check In', render: (r) => <span className="text-muted-foreground">{r.checkIn}</span> },
              { key: 'checkOut', label: 'Check Out', render: (r) => <span className="text-muted-foreground">{r.checkOut}</span> },
              {
                key: 'workMode',
                label: 'Mode',
                width: '90px',
                render: (r) => (
                  <span className="text-muted-foreground">
                    {r.status === 'Leave' ? 'Leave' : r.checkIn && r.checkIn !== '—' ? (r.workMode || 'Office') : '—'}
                  </span>
                ),
              },
              {
                key: 'late',
                label: 'Late',
                width: '60px',
                sortable: false,
                render: (r) =>
                  workStart && r.checkIn && r.checkIn !== '—' && r.checkIn > workStart ? (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-warning/10 text-warning">Late</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
              },
              {
                key: 'hours',
                label: 'Total Hours',
                width: '110px',
                render: (r) => <span className="text-foreground font-semibold">{formatHours(r.hours)}</span>,
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
                  <span className="text-xs text-muted-foreground">{r.checkIn} — {r.checkOut}</span>
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

        <HolidaysCard />
      </div>
    </HrLayout>
  );
}
