import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { employeesApi, candidatesApi, interviewsApi, attendanceApi } from '../utils/api';

const HrDeskContext = createContext(null);

// Single source of truth for employees/candidates/interviews/attendance —
// previously HrLayout (for its search index) and up to five separate HR
// pages (Overview, Directory, Candidates, Interviews, Attendance, Reports)
// each fetched their own independent copy of the same lists, so a single
// page load fired the same GET 2-5x over (visible as duplicate `employees`/
// `candidates`/`interviews` rows in the Network tab). One fetch here, on
// mount, shared by every consumer via context; each page keeps doing its
// own optimistic create/update/delete against the shared arrays exactly as
// it did against its own local state before.
export function HrDeskProvider({ children }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mirrors hrDeskRoutes.js's own role gates: employees is readable by
  // hr/founder/coordinator (Coordinator picks a real employee as a task
  // assignee), the other three are hr/founder only.
  const canSeeEmployees = Boolean(user) && ['hr', 'founder', 'coordinator'].includes(user.role);
  const canSeeHrDesk = Boolean(user) && ['hr', 'founder'].includes(user.role);

  const refreshEmployees = useCallback(async () => {
    if (!canSeeEmployees) return setEmployees([]);
    try {
      const { data } = await employeesApi.list();
      setEmployees(data);
    } catch (e) {
      console.error('Failed to load employees:', e.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeEmployees]);

  const refreshCandidates = useCallback(async () => {
    if (!canSeeHrDesk) return setCandidates([]);
    try {
      const { data } = await candidatesApi.list();
      setCandidates(data);
    } catch (e) {
      console.error('Failed to load candidates:', e.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeHrDesk]);

  const refreshInterviews = useCallback(async () => {
    if (!canSeeHrDesk) return setInterviews([]);
    try {
      const { data } = await interviewsApi.list();
      setInterviews(data);
    } catch (e) {
      console.error('Failed to load interviews:', e.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeHrDesk]);

  const refreshAttendance = useCallback(async () => {
    if (!canSeeHrDesk) return setAttendanceRecords([]);
    try {
      const { data } = await attendanceApi.list();
      setAttendanceRecords(data);
    } catch (e) {
      console.error('Failed to load attendance:', e.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeHrDesk]);

  useEffect(() => {
    setLoading(true);
    Promise.all([refreshEmployees(), refreshCandidates(), refreshInterviews(), refreshAttendance()]).finally(() =>
      setLoading(false)
    );
  }, [refreshEmployees, refreshCandidates, refreshInterviews, refreshAttendance]);

  return (
    <HrDeskContext.Provider
      value={{
        employees,
        setEmployees,
        refreshEmployees,
        candidates,
        setCandidates,
        refreshCandidates,
        interviews,
        setInterviews,
        refreshInterviews,
        attendanceRecords,
        setAttendanceRecords,
        refreshAttendance,
        loading,
      }}
    >
      {children}
    </HrDeskContext.Provider>
  );
}

export function useHrDesk() {
  return useContext(HrDeskContext);
}
