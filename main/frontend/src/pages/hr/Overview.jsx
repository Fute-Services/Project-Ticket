import { useNavigate } from 'react-router-dom';
import { Cpu } from 'lucide-react';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, StatCard, Badge } from '../../components/ui';
import DonutChart from '../../components/DonutChart';
import { useApprovals } from '../../context/ApprovalContext';
import {
  employees,
  candidates,
  interviews,
  attendanceRecords,
  notifications,
  CANDIDATE_STAGES,
} from '../../data/hrMockData';

const TODAY = '2026-08-06';

// Fixed color per stage/status so a value always renders the same color
// wherever it shows up — same principle as ui.jsx's Badge STATUS_COLORS.
const STAGE_COLOR = {
  Applied: '#9ca3af',
  Screening: '#eab308',
  'HR Round': '#f97316',
  'Technical Round': '#3b82f6',
  'Final Interview': '#a855f7',
  'Offer Sent': '#06b6d4',
  Joined: '#10b981',
  Rejected: '#ef4444',
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

export default function HrOverview() {
  const navigate = useNavigate();
  const { approvals } = useApprovals();

  const activeEmployees = employees.filter((e) => e.status === 'Active').length;
  const interviewsToday = interviews.filter((i) => i.date === TODAY && i.status === 'Scheduled').length;
  const todaysAttendance = attendanceRecords.filter((a) => a.date === TODAY);
  const presentToday = todaysAttendance.filter((a) => a.status === 'Present' || a.status === 'Work From Home').length;
  const attendancePct = todaysAttendance.length ? Math.round((presentToday / todaysAttendance.length) * 100) : 0;

  const candidatePipeline = toDonutData(candidates, 'stage', CANDIDATE_STAGES, STAGE_COLOR);

  const departmentCounts = employees.reduce((acc, e) => {
    acc[e.department] = (acc[e.department] || 0) + 1;
    return acc;
  }, {});

  const recentCandidates = candidates.slice(0, 5);
  const upcomingInterviews = interviews.filter((i) => i.status === 'Scheduled').slice(0, 5);
  const itApprovals = approvals.filter((a) => a.source === 'IT' && a.status === 'approved').slice(0, 4);

  return (
    <HrLayout>
      <div className="w-full flex flex-col gap-3.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none mb-1">
            Dashboard
          </h1>
          <p className="text-[11px] text-gray-400">
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
            <SectionHeader title="IT Approvals" action={<Cpu size={14} className="text-cyan-400" />} />
            <div className="flex flex-col gap-1.5">
              {itApprovals.length === 0 ? (
                <p className="text-xs text-gray-500 py-3 text-center">No founder-approved IT items yet.</p>
              ) : (
                itApprovals.map((a) => (
                  <div key={a.id} className="p-2 rounded-xl bg-[#18181c] border border-white/5 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-white truncate">{a.title}</div>
                      <div className="text-[10px] text-gray-400 truncate">{a.sub}</div>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      Approved
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Recent Candidates / Upcoming Interviews */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Card className="!p-3.5">
            <SectionHeader
              title="Recent Candidates"
              action={
                <button type="button" onClick={() => navigate('/hr/candidates')} className="text-xs text-[#e86024] font-semibold hover:underline cursor-pointer">
                  View all
                </button>
              }
            />
            <div className="flex flex-col gap-1.5">
              {recentCandidates.slice(0, 3).map((c) => (
                <div key={c.id} className="p-2 rounded-xl bg-[#18181c] border border-white/5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-white truncate">{c.name}</div>
                    <div className="text-[10px] text-gray-400 truncate">{c.appliedFor} · {c.experience}</div>
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
                <button type="button" onClick={() => navigate('/hr/interviews')} className="text-xs text-[#e86024] font-semibold hover:underline cursor-pointer">
                  View all
                </button>
              }
            />
            <div className="flex flex-col gap-1.5">
              {upcomingInterviews.length === 0 ? (
                <p className="text-xs text-gray-500 py-3 text-center">Nothing scheduled.</p>
              ) : (
                upcomingInterviews.slice(0, 3).map((i) => (
                  <div key={i.id} className="p-2 rounded-xl bg-[#18181c] border border-white/5 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-white truncate">{i.candidate}</div>
                      <div className="text-[10px] text-gray-400 truncate">{i.type} · {i.interviewer}</div>
                    </div>
                    <div className="text-[10px] text-gray-400 text-right shrink-0">
                      <div>{i.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Department Breakdown */}
        <Card className="!p-3.5">
          <SectionHeader title="Headcount by Department" />
          <div className="flex flex-col gap-2.5">
            {Object.entries(departmentCounts).map(([dept, count]) => (
              <div key={dept} className="flex items-center gap-3">
                <span className="text-xs text-gray-300 w-36 shrink-0 truncate">{dept}</span>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#e86024] to-amber-400 rounded-full"
                    style={{ width: `${(count / employees.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-white w-5 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </HrLayout>
  );
}
