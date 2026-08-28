import { FileText, FileSpreadsheet, File } from 'lucide-react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader } from '../../components/ui';
import { departmentPerformance } from '../../data/hrMockData';
import { useLeave } from '../../context/LeaveContext';
import { useHrDesk } from '../../context/HrDeskContext';
import { getAllLeaves } from '../../utils/api';

// Leave requests now come from LeaveContext 20 at a time (see
// LeaveContext.jsx) so the poll that keeps HR's queue fresh doesn't re-read
// the whole collection every cycle — but a report export needs every row,
// not just whatever page happens to be loaded. Walks the same cursor
// straight against the API (bypassing context state) so exporting doesn't
// depend on how many "Load More" clicks happened to occur first.
async function fetchAllLeaves() {
  const rows = [];
  let cursor;
  do {
    const { data } = await getAllLeaves(cursor);
    rows.push(...(data?.items || []));
    cursor = data?.nextCursor || null;
  } while (cursor);
  return rows;
}

function buildReports({ employees, attendanceRecords, leaveRequests, candidates, interviews }) {
  return [
    {
      id: 'hiring',
      title: 'Hiring Report',
      desc: 'Applications, stages, and time-to-hire across roles.',
      headers: ['Candidate', 'Applied For', 'Stage', 'Source', 'Applied On'],
      rows: () => candidates.map((c) => [c.name, c.appliedFor, c.stage, c.source, String(c.appliedOn || '').slice(0, 10)]),
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

// A real .xls Excel can open, without pulling in a spreadsheet-writing
// dependency: Excel has long supported opening an HTML table saved with an
// .xls extension + the ms-excel MIME type (the `xmlns:x` block below just
// names the sheet). Not a true .xlsx, but it opens as an actual spreadsheet
// with real columns/rows — unlike the "Excel" button before this, which
// silently produced the same file as "CSV".
function downloadExcel(filename, headers, rows) {
  const escape = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const headerRow = `<tr>${headers.map((h) => `<th>${escape(h)}</th>`).join('')}</tr>`;
  const bodyRows = rows.map((r) => `<tr>${r.map((c) => `<td>${escape(c)}</td>`).join('')}</tr>`).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head>
<body><table border="1">${headerRow}${bodyRows}</table></body>
</html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
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
  const { employees, attendanceRecords, candidates, interviews } = useHrDesk();

  const REPORTS = buildReports({ employees, attendanceRecords, leaveRequests, candidates, interviews });

  async function exportReport(report, format) {
    const rows = report.id === 'leave'
      ? buildReports({ employees, attendanceRecords, leaveRequests: await fetchAllLeaves(), candidates, interviews })
          .find((r) => r.id === 'leave')
          .rows()
      : report.rows();
    if (format === 'pdf') {
      openPrintable(report.title, report.headers, rows);
    } else if (format === 'excel') {
      downloadExcel(`${report.id}-report.xls`, report.headers, rows);
    } else {
      downloadCsv(`${report.id}-report.csv`, report.headers, rows);
    }
  }

  return (
    <HrLayout>
      <div className="flex flex-col gap-6 w-full">
        <SectionHeader title="Reports" subtitle="Generate and export HR reports" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {REPORTS.map((r) => (
            <Card key={r.id}>
              <h3 className="text-sm font-bold text-foreground mb-1.5">{r.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{r.desc}</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportReport(r, 'pdf')}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors cursor-pointer"
                >
                  <FileText size={12} />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => exportReport(r, 'excel')}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet size={12} />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => exportReport(r, 'csv')}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors cursor-pointer"
                >
                  <File size={12} />
                  CSV
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </HrLayout>
  );
}
