import { useEffect, useState } from 'react';
import { FileText, FileSpreadsheet, File, Download } from 'lucide-react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader } from '../../components/ui';
import { departmentPerformance } from '../../data/hrMockData';
import { useLeave } from '../../context/LeaveContext';
import { employeesApi, attendanceApi, candidatesApi, interviewsApi } from '../../utils/api';

function buildReports({ employees, attendanceRecords, leaveRequests, candidates, interviews }) {
  return [
    {
      id: 'hiring',
      title: 'Hiring Report',
      desc: 'Applications, stages, and time-to-hire across roles.',
      headers: ['Candidate', 'Applied For', 'Stage', 'Source', 'Applied On'],
      rows: () => candidates.map((c) => [c.name, c.appliedFor, c.stage, c.source, c.appliedOn]),
    },
    {
      id: 'attendance',
      title: 'Attendance Report',
      desc: 'Daily and monthly attendance breakdown per employee.',
      headers: ['Employee', 'Date', 'Status', 'Check In', 'Check Out'],
      rows: () =>
        attendanceRecords.map((r) => {
          const e = employees.find((emp) => emp.id === r.employeeId);
          return [e?.name || r.employeeId, r.date, r.status, r.checkIn, r.checkOut];
        }),
    },
    {
      id: 'leave',
      title: 'Leave Report',
      desc: 'Leave taken, balances, and approval turnaround.',
      headers: ['Employee', 'Type', 'From', 'To', 'Days', 'Status'],
      rows: () => leaveRequests.map((l) => [l.employee, l.type, l.from, l.to, l.days, l.status]),
    },
    {
      id: 'interview',
      title: 'Interview Report',
      desc: 'Interview volume, outcomes, and interviewer load.',
      headers: ['Candidate', 'Type', 'Interviewer', 'Date', 'Time', 'Status'],
      rows: () => interviews.map((i) => [i.candidate, i.type, i.interviewer, i.date, i.time, i.status]),
    },
    {
      id: 'recruitment',
      title: 'Recruitment Report',
      desc: 'Source effectiveness and pipeline conversion.',
      headers: ['Source', 'Candidates', 'Joined'],
      rows: () => {
        const bySource = {};
        candidates.forEach((c) => {
          bySource[c.source] = bySource[c.source] || { total: 0, joined: 0 };
          bySource[c.source].total += 1;
          if (c.stage === 'Joined') bySource[c.source].joined += 1;
        });
        return Object.entries(bySource).map(([source, s]) => [source, s.total, s.joined]);
      },
    },
    {
      id: 'performance',
      title: 'Performance Report',
      desc: 'Department performance scores over time.',
      headers: ['Department', 'Score'],
      rows: () => departmentPerformance.map((d) => [d.department, d.score]),
    },
  ];
}

function toCsv(headers, rows) {
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}

function downloadCsv(filename, headers, rows) {
  const blob = new Blob([toCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function openPrintable(title, headers, rows) {
  const win = window.open('', '_blank');
  if (!win) return;
  const tableRows = rows
    .map((r) => `<tr>${r.map((c) => `<td style="padding:6px 10px;border:1px solid #ddd;">${c}</td>`).join('')}</tr>`)
    .join('');
  win.document.write(`
    <html>
      <head><title>${title}</title></head>
      <body style="font-family:sans-serif;padding:24px;">
        <h2>${title}</h2>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <thead><tr>${headers.map((h) => `<th style="padding:6px 10px;border:1px solid #ddd;text-align:left;background:#f3f3f3;">${h}</th>`).join('')}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

export default function Reports() {
  const { leaveRequests } = useLeave();
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    employeesApi.list().then(({ data }) => setEmployees(data)).catch((e) => console.error('Failed to load employees:', e.message));
    attendanceApi.list().then(({ data }) => setAttendanceRecords(data)).catch((e) => console.error('Failed to load attendance:', e.message));
    candidatesApi.list().then(({ data }) => setCandidates(data)).catch((e) => console.error('Failed to load candidates:', e.message));
    interviewsApi.list().then(({ data }) => setInterviews(data)).catch((e) => console.error('Failed to load interviews:', e.message));
  }, []);

  const REPORTS = buildReports({ employees, attendanceRecords, leaveRequests, candidates, interviews });

  function exportReport(report, format) {
    const rows = report.rows();
    if (format === 'pdf') {
      openPrintable(report.title, report.headers, rows);
    } else {
      downloadCsv(`${report.id}-report.csv`, report.headers, rows);
    }
  }

  return (
    <HrLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <SectionHeader title="Reports" subtitle="Generate and export HR reports" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTS.map((r) => (
            <Card key={r.id}>
              <h3 className="text-sm font-bold text-foreground mb-1.5">{r.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{r.desc}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportReport(r, 'pdf')}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors cursor-pointer"
                >
                  <FileText size={12} />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => exportReport(r, 'excel')}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet size={12} />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => exportReport(r, 'csv')}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors cursor-pointer"
                >
                  <File size={12} />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportReport(r, 'csv')}
                  className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors cursor-pointer"
                >
                  <Download size={12} />
                  Generate
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </HrLayout>
  );
}
