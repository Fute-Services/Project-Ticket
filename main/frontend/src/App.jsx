import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LeaveProvider } from './context/LeaveContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import RequireAuth from './components/RequireAuth';
import HrOverview from './pages/hr/Overview';
import HrCandidates from './pages/hr/Candidates';
import HrInterviews from './pages/hr/Interviews';
import HrMeetings from './pages/hr/Meetings';
import HrAttendance from './pages/hr/Attendance';
import HrLeave from './pages/hr/Leave';
import HrEmail from './pages/hr/Email';
import HrFeedback from './pages/hr/Feedback';
import HrDirectory from './pages/hr/Directory';
import HrReports from './pages/hr/Reports';
import HrActivityLogs from './pages/hr/ActivityLogs';
import CoordinatorOverview from './pages/coordinator/Overview';
import CoordinatorTasks from './pages/coordinator/Tasks';

import FounderDashboardPage from './pages/FounderDashboardPage';

const DASHBOARD_ROUTES = [
  { path: '/it/dashboard', allow: ['it'] },
  { path: '/employee/dashboard', allow: ['employee'] },
];

const HR_ROUTES = [
  { path: '/hr/overview', element: <HrOverview /> },
  { path: '/hr/candidates', element: <HrCandidates /> },
  { path: '/hr/interviews', element: <HrInterviews /> },
  { path: '/hr/meetings', element: <HrMeetings /> },
  { path: '/hr/attendance', element: <HrAttendance /> },
  { path: '/hr/leave', element: <HrLeave /> },
  { path: '/hr/email', element: <HrEmail /> },
  { path: '/hr/feedback', element: <HrFeedback /> },
  { path: '/hr/directory', element: <HrDirectory /> },
  { path: '/hr/reports', element: <HrReports /> },
  { path: '/hr/activity', element: <HrActivityLogs /> },
];

const COORDINATOR_ROUTES = [
  { path: '/coordinator/overview', element: <CoordinatorOverview /> },
  { path: '/coordinator/tasks', element: <CoordinatorTasks /> },
];

export default function App() {
  return (
    <AuthProvider>
      <LeaveProvider>
      <BrowserRouter>
        <Routes>
          {/* Sign-in is the front door. Signup is reached from the panel's own
              cross-link, so there's no separate landing page to pass through. */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route
            path="/founder/dashboard"
            element={
              <RequireAuth allow={['founder']}>
                <FounderDashboardPage />
              </RequireAuth>
            }
          />
          {DASHBOARD_ROUTES.map(({ path, allow }) => (
            <Route
              key={path}
              path={path}
              element={
                <RequireAuth allow={allow}>
                  <DashboardPage />
                </RequireAuth>
              }
            />
          ))}
          {/* Legacy path some links still point at — send it to the new HR home. */}
          <Route path="/hr/dashboard" element={<Navigate to="/hr/overview" replace />} />
          {HR_ROUTES.map(({ path, element }) => (
            <Route
              key={path}
              path={path}
              element={<RequireAuth allow={['hr']}>{element}</RequireAuth>}
            />
          ))}
          {COORDINATOR_ROUTES.map(({ path, element }) => (
            <Route
              key={path}
              path={path}
              element={<RequireAuth allow={['coordinator']}>{element}</RequireAuth>}
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </LeaveProvider>
    </AuthProvider>
  );
}
