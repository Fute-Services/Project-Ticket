import { useNavigate } from 'react-router-dom';
import { Ticket, AlertTriangle } from 'lucide-react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, StatCard, Badge } from '../../components/ui';
import DonutChart from '../../components/DonutChart';
import { useTickets } from '../../context/TicketContext';
import { useHrDesk } from '../../context/HrDeskContext';
import { useHrNotifications } from '../../hooks/useHrNotifications';
import { CANDIDATE_STAGES } from '../../data/hrMockData';

const TODAY = '2026-08-06';

// Fixed color per stage/status so a value always renders the same color
// wherever it shows up — same principle as ui.jsx's Badge STATUS_COLORS.
const STAGE_COLOR = {
  Applied: 'hsl(var(--chart-1))',
  Screening: 'hsl(var(--chart-2))',
  'HR Round': 'hsl(var(--chart-3))',
  'Technical Round': 'hsl(var(--chart-4))',
  'Final Interview': 'hsl(var(--chart-5))',
  'Offer Sent': 'hsl(var(--chart-6))',
  Joined: 'hsl(var(--chart-1))',
  Rejected: 'hsl(var(--chart-2))',
};

// Groups `rows` by `key` into DonutChart's {label, value, percent, color} shape.
function toDonutData(rows, key, statuses, colorMap) {
  const total = rows.length || 1;
  return statuses
    .map((label) => {
      const value = rows.filter((r) => r[key] === label).length;
      return { label, value, percent: Math.round((value / total) * 100), color: colorMap[label] };
    })
    .filter((s) => s.value > 0);
}

const TICKET_STATUS_KEYS = ['Open', 'In Progress', 'Waiting Approval', 'Resolved'];
const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };
const PRIORITY_STYLE = {
  High: 'bg-destructive/10 text-destructive border-destructive/20',
  Medium: 'bg-warning/10 text-warning border-warning/20',
  Low: 'bg-muted/20 text-muted-foreground border-muted/30',
};

// Days since `dateStr` (yyyy-mm-dd). Tickets are real, live-created data —
// unlike the seeded interview/attendance mock data elsewhere on this page,
// which is anchored to the fixed demo TODAY — so this deliberately uses the
// real current date. Comparing a real ticket's submission date against the
// hardcoded TODAY (2026-08-06, in the past) always produced a negative day
// count, so the "N tickets open 3+ days" alert below could never fire.
function daysSince(dateStr) {
  if (!dateStr) return 0;
  const diff = new Date() - new Date(dateStr);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function HrOverview() {
  const navigate = useNavigate();
  const { tickets } = useTickets();
  const { employees, candidates, interviews, attendanceRecords } = useHrDesk();
  const notifications = useHrNotifications();

  const activeEmployees = employees.filter((e) => e.status === 'Active').length;
  const interviewsToday = interviews.filter((i) => i.date === TODAY && i.status === 'Scheduled').length;
  const todaysAttendance = attendanceRecords.filter((a) => a.date === TODAY);
  const presentToday = todaysAttendance.filter((a) => a.status === 'Present' || a.status === 'Work From Home').length;
  const attendancePct = todaysAttendance.length ? Math.round((presentToday / todaysAttendance.length) * 100) : 0;

  const candidatePipeline = toDonutData(candidates, 'stage', CANDIDATE_STAGES, STAGE_COLOR);

  const recentCandidates = candidates.slice(0, 5);
  const upcomingInterviews = interviews.filter((i) => i.status === 'Scheduled').slice(0, 5);

  const ticketStatusCounts = TICKET_STATUS_KEYS.reduce((acc, s) => {
    acc[s] = tickets.filter((t) => t.status === s).length;
    return acc;
  }, {});
  const agingTickets = tickets.filter((t) => t.status === 'Open' && daysSince(t.date) >= 3);
  const urgentTickets = tickets
    .filter((t) => t.status !== 'Resolved' && t.status !== 'Closed')
    .sort((a, b) => {
      const rankDiff = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
      return rankDiff !== 0 ? rankDiff : daysSince(b.date) - daysSince(a.date);
    })
    .slice(0, 4);

  return (
    <HrLayout>
      <div className="w-full flex flex-col gap-3.5">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1">
            Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">
            {employees.length} employees · {candidates.length} candidates in pipeline.
          </p>
        </div>

        {/* Key Stat Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <StatCard label="Total Employees" value={employees.length} sub={`${activeEmployees} active`} accent="#f97316" />
          <StatCard label="Attendance Today" value={`${attendancePct}%`} sub={`${presentToday}/${todaysAttendance.length} present`} accent="#10b981" />
          <StatCard label="Candidates" value={candidates.length} sub="in pipeline" accent="#a855f7" />
          <StatCard label="Interviews Today" value={interviewsToday} sub="scheduled" accent="#3b82f6" />
          <StatCard label="Notifications" value={notifications.filter((n) => n.unread).length} sub="unread" accent="#e86024" />
        </div>

        {/* Donut Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          <DonutChart title="Candidate Pipeline" total={candidates.length} data={candidatePipeline} />

          <Card className="!p-3.5">
            <SectionHeader
              title="HR Tickets"
              action={<Ticket size={14} className="text-muted-foreground" />}
            />

            {/* Status snapshot */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {TICKET_STATUS_KEYS.map((s) => (
                <span
                  key={s}
                  className="text-xs font-semibold px-2 py-1 rounded-lg bg-muted border border-border text-muted-foreground"
                >
                  {s}: <span className="text-foreground font-bold">{ticketStatusCounts[s]}</span>
                </span>
              ))}
            </div>

            {/* Aging alert — only shown when something is actually overdue */}
            {agingTickets.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-warning bg-warning/10 border border-warning/20 rounded-lg px-2.5 py-1.5 mb-2.5">
                <AlertTriangle size={12} />
                {agingTickets.length} ticket{agingTickets.length === 1 ? '' : 's'} open 3+ days
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              {urgentTickets.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">No open tickets — all caught up.</p>
              ) : (
                urgentTickets.map((t) => (
                  <div key={t.id} className="p-2 rounded-xl bg-muted border border-border flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-foreground truncate">{t.user}</div>
                      <div className="text-xs text-muted-foreground truncate">{t.title}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.Medium}`}>
                        {t.priority || 'Medium'}
                      </span>
                      <span className="text-xs text-muted-foreground">{t.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('/hr/tickets')}
              className="mt-2.5 text-xs text-primary font-semibold hover:underline cursor-pointer self-end block ml-auto"
            >
              View Tickets Queue →
            </button>
          </Card>
        </div>

        {/* Recent Candidates / Upcoming Interviews */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Card className="!p-3.5">
            <SectionHeader
              title="Recent Candidates"
              action={
                <button type="button" onClick={() => navigate('/hr/candidates')} className="text-xs text-primary font-semibold hover:underline cursor-pointer">
                  View all
                </button>
              }
            />
            <div className="flex flex-col gap-1.5">
              {recentCandidates.slice(0, 3).map((c) => (
                <div key={c.id} className="p-2 rounded-xl bg-muted border border-border flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-foreground truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.appliedFor} · {c.experience}</div>
                  </div>
                  <Badge value={c.stage} className="shrink-0" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="!p-3.5">
            <SectionHeader
              title="Upcoming Interviews"
              action={
                <button type="button" onClick={() => navigate('/hr/interviews')} className="text-xs text-primary font-semibold hover:underline cursor-pointer">
                  View all
                </button>
              }
            />
            <div className="flex flex-col gap-1.5">
              {upcomingInterviews.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">Nothing scheduled.</p>
              ) : (
                upcomingInterviews.slice(0, 3).map((i) => (
                  <div key={i.id} className="p-2 rounded-xl bg-muted border border-border flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-foreground truncate">{i.candidate}</div>
                      <div className="text-xs text-muted-foreground truncate">{i.type} · {i.interviewer}</div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right shrink-0">
                      <div>{i.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </HrLayout>
  );
}
