import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { attendanceApi } from '../utils/api';

function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

// "HH:MM" (today) -> a real Date, so the live timer has a fixed start point
// to count up from. Matches the "HH:MM" format Attendance.jsx already
// reads/writes for checkIn/checkOut (see hrDeskController.js's checkIn/
// checkOut handlers) rather than inventing a second timestamp format.
function todayAt(hhmm) {
  if (!hhmm || hhmm === '-') return null;
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return [h, m, s];
}

// Self-service Check-in/Check-out — Attendance/Check-in module (Employee
// Details area). Only ever acts on the current user's own attendance record
// (backend resolves it from the authenticated user, not a client-supplied
// id — see checkIn/checkOut in hrDeskController.js), so this is safe to drop
// onto the Employee/HR/Founder dashboards without any per-employee wiring.
export default function CheckInWidget() {
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [workMode, setWorkMode] = useState('Office');

  useEffect(() => {
    attendanceApi
      .myToday()
      .then(({ data }) => setRecord(data))
      .catch((e) => console.error('Failed to load today’s attendance:', e.message))
      .finally(() => setLoading(false));
  }, []);

  const isCheckedIn = Boolean(record?.checkIn && record.checkIn !== '-' && (!record.checkOut || record.checkOut === '-'));
  const isOnLeave = record?.status === 'Leave';

  // Only tick the clock while actually checked in — no point re-rendering
  // every second for a widget that's just showing a static "Check in" button.
  useEffect(() => {
    if (!isCheckedIn) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [isCheckedIn]);

  async function handleCheckIn() {
    setBusy(true);
    try {
      const { data } = await attendanceApi.checkIn(workMode);
      setRecord(data);
      setNow(new Date());
    } catch (e) {
      toast.error('Could not check in', { description: e.response?.data?.error || e.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckOut() {
    setBusy(true);
    try {
      const { data } = await attendanceApi.checkOut();
      setRecord(data);
    } catch (e) {
      toast.error('Could not check out', { description: e.response?.data?.error || e.message });
    } finally {
      setBusy(false);
    }
  }

  const start = isCheckedIn ? todayAt(record.checkIn) : null;
  const [hh, mm, ss] = start ? formatElapsed(now - start) : ['00', '00', '00'];

  return (
    <div className="w-full h-full bg-card border border-border rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
      <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mb-2 shadow-md">
        {initialsOf(user?.full_name)}
      </div>
      <div className="text-xs font-semibold text-foreground truncate w-full">{user?.full_name || 'You'}</div>

      {loading ? (
        <div className="text-xs text-muted-foreground mt-3">Loading…</div>
      ) : isCheckedIn ? (
        <>
          <div className="text-xs font-semibold text-primary mt-1">In {record.workMode === 'WFH' ? '· WFH' : ''}</div>
          <div className="flex items-center justify-center gap-1 my-2">
            {[hh, mm, ss].map((v, i) => (
              <span key={i} className="bg-muted border border-border rounded-md px-2 py-1 font-mono text-sm text-foreground">
                {v}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCheckOut}
            disabled={busy}
            className="mt-1 px-4 py-1.5 rounded-full border border-destructive text-destructive text-xs font-semibold hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            {busy ? 'Checking out…' : 'Check-out'}
          </button>
        </>
      ) : isOnLeave ? (
        <div className="text-xs font-semibold text-warning mt-2 mb-1">On Leave today</div>
      ) : (
        <>
          <div className="text-xs text-muted-foreground mt-1 mb-2">
            {record?.checkOut && record.checkOut !== '-' ? `Checked out at ${record.checkOut}` : 'Not checked in yet'}
          </div>
          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            className="mb-2 w-full bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground cursor-pointer"
          >
            <option value="Office">Office</option>
            <option value="WFH">Work From Home</option>
            <option value="Leave">Leave</option>
          </select>
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={busy || (record?.checkOut && record.checkOut !== '-')}
            className="px-4 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {busy ? (workMode === 'Leave' ? 'Marking…' : 'Checking in…') : workMode === 'Leave' ? 'Mark Leave' : 'Check-in'}
          </button>
        </>
      )}
    </div>
  );
}
