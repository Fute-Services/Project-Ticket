import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LeaveProvider } from './context/LeaveContext';
import { TicketProvider } from './context/TicketContext';
import { ApprovalProvider } from './context/ApprovalContext';
import { PermissionsProvider } from './context/PermissionsContext';
import { TaskProjectProvider } from './context/TaskProjectContext';
import { RenderProvider } from './context/RenderContext';
import { AssetProvider } from './context/AssetContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import EmployeeDashboardPage from './pages/EmployeeDashboardPage';
import RequireAuth from './components/RequireAuth';
import { Toaster } from './components/ui/sonner';
import HrOverview from './pages/hr/Overview';
import HrCandidates from './pages/hr/Candidates';
import HrInterviews from './pages/hr/Interviews';
import HrAttendance from './pages/hr/Attendance';
import HrEmail from './pages/hr/Email';
import HrDirectory from './pages/hr/Directory';
import HrReports from './pages/hr/Reports';
import CoordinatorOverview from './pages/coordinator/Overview';
import CoordinatorTasks from './pages/coordinator/Tasks';
import CoordinatorProjects from './pages/coordinator/Projects';
import CoordinatorProjectDetail from './pages/coordinator/ProjectDetail';

import FounderLandingPage from './pages/FounderLandingPage';
import FounderDashboardPage from './pages/FounderDashboardPage';
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage';
import DepartmentDashboardPage from './pages/DepartmentDashboardPage';

const DASHBOARD_ROUTES = [{ path: '/it/dashboard', allow: ['it'] }];

// Sales, Developers, Marketing, Branding, Production — demo-only roles with
// no backend of their own yet (see data/deptDemoData.js). Each gets its own
// route, scoped to just that role, same isolation as every other dashboard.
const DEPARTMENT_ROLES = ['sales', 'developers', 'marketing', 'branding', 'production'];

const HR_ROUTES = [
  { path: '/hr/overview', element: <HrOverview /> },
  { path: '/hr/candidates', element: <HrCandidates /> },
  { path: '/hr/interviews', element: <HrInterviews /> },
  { path: '/hr/attendance', element: <HrAttendance /> },
  { path: '/hr/email', element: <HrEmail /> },
  { path: '/hr/directory', element: <HrDirectory /> },
  { path: '/hr/reports', element: <HrReports /> },
];

const COORDINATOR_ROUTES = [
  { path: '/coordinator/overview', element: <CoordinatorOverview /> },
  { path: '/coordinator/tasks', element: <CoordinatorTasks /> },
  { path: '/coordinator/projects', element: <CoordinatorProjects /> },
  { path: '/coordinator/projects/:projectId', element: <CoordinatorProjectDetail /> },
];

export default function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
      <LeaveProvider>
      <TicketProvider>
      <ApprovalProvider>
      <TaskProjectProvider>
      <RenderProvider>
      <AssetProvider>
      <BrowserRouter>
        <Routes>
          {/* Sign-in is the front door. Signup is reached from the panel's own
              cross-link, so there's no separate landing page to pass through. */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="/founder" element={<Navigate to="/founder/dashboard" replace />} />
          <Route
            path="/founder/dashboard"
            element={
              <RequireAuth allow={['founder']}>
                <FounderDashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/dashboard"
            element={
              <RequireAuth allow={['superadmin']}>
                <SuperAdminDashboardPage />
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
          <Route
            path="/employee/dashboard"
            element={
              <RequireAuth allow={['employee']}>
                <EmployeeDashboardPage />
              </RequireAuth>
            }
          />
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
          {DEPARTMENT_ROLES.map((role) => (
            <Route
              key={role}
              path={`/department/${role}`}
              element={
                <RequireAuth allow={[role]}>
                  <DepartmentDashboardPage />
                </RequireAuth>
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-right" richColors closeButton />
      </BrowserRouter>
      </AssetProvider>
      </RenderProvider>
      </TaskProjectProvider>
      </ApprovalProvider>
      </TicketProvider>
      </LeaveProvider>
      </PermissionsProvider>
    </AuthProvider>
  );
}
