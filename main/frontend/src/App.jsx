import { lazy, Suspense } from 'react';
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
import RequireAuth, { AppSkeleton } from './components/RequireAuth';
import { Toaster } from './components/ui/sonner';

// Lazy-loaded so a visitor only downloads the JS for the role/page they
// actually reach, instead of one bundle containing every role's pages
// (HR, Coordinator, SuperAdmin, Founder, Department) up front. LoginPage
// stays a regular import above since it's the default route and should
// paint immediately with no extra chunk round-trip.
const SignupPage = lazy(() => import('./pages/SignupPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const EmployeeDashboardPage = lazy(() => import('./pages/EmployeeDashboardPage'));
const HrOverview = lazy(() => import('./pages/hr/Overview'));
const HrCandidates = lazy(() => import('./pages/hr/Candidates'));
const HrInterviews = lazy(() => import('./pages/hr/Interviews'));
const HrAttendance = lazy(() => import('./pages/hr/Attendance'));
const HrEmail = lazy(() => import('./pages/hr/Email'));
const HrDirectory = lazy(() => import('./pages/hr/Directory'));
const HrReports = lazy(() => import('./pages/hr/Reports'));
const HrTickets = lazy(() => import('./pages/hr/Tickets'));
const HrApprovals = lazy(() => import('./pages/hr/Approvals'));
const CoordinatorOverview = lazy(() => import('./pages/coordinator/Overview'));
const CoordinatorTasks = lazy(() => import('./pages/coordinator/Tasks'));
const CoordinatorProjects = lazy(() => import('./pages/coordinator/Projects'));
const CoordinatorProjectDetail = lazy(() => import('./pages/coordinator/ProjectDetail'));

const FounderLandingPage = lazy(() => import('./pages/FounderLandingPage'));
const FounderDashboardPage = lazy(() => import('./pages/FounderDashboardPage'));
const SuperAdminOverviewPage = lazy(() => import('./pages/SuperAdminOverviewPage'));
const SuperAdminDashboardPage = lazy(() => import('./pages/SuperAdminDashboardPage'));
const SuperAdminUsersPage = lazy(() => import('./pages/SuperAdminUsersPage'));
const SuperAdminDepartmentsPage = lazy(() => import('./pages/SuperAdminDepartmentsPage'));
const SuperAdminSLAPage = lazy(() => import('./pages/SuperAdminSLAPage'));
const SuperAdminSecurityPage = lazy(() => import('./pages/SuperAdminSecurityPage'));
const SuperAdminActivityPage = lazy(() => import('./pages/SuperAdminActivityPage'));
const SuperAdminAnalyticsPage = lazy(() => import('./pages/SuperAdminAnalyticsPage'));
const SuperAdminAuditLogPage = lazy(() => import('./pages/SuperAdminAuditLogPage'));
const SuperAdminSettingsPage = lazy(() => import('./pages/SuperAdminSettingsPage'));
const DepartmentDashboardPage = lazy(() => import('./pages/DepartmentDashboardPage'));

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
  { path: '/hr/tickets', element: <HrTickets /> },
  { path: '/hr/approvals', element: <HrApprovals /> },
];

const COORDINATOR_ROUTES = [
  { path: '/coordinator/overview', element: <CoordinatorOverview /> },
  { path: '/coordinator/tasks', element: <CoordinatorTasks /> },
  { path: '/coordinator/projects', element: <CoordinatorProjects /> },
  { path: '/coordinator/projects/:projectId', element: <CoordinatorProjectDetail /> },
];

// ponytail: every non-auth provider below already role-gates its own fetch
// (e.g. AssetContext no-ops unless user.role is 'it'/'founder'), so an HR
// user landing here triggers no wasted Asset/Render calls — but a role-gated
// context still fetches on login even if that role never visits the one page
// consuming it this session (an IT user lands on Dashboard, Asset Management
// data loads anyway). Fixing that fully means moving each context's initial
// refresh() from provider-mount to first-consumer-mount across 6 contexts
// and every page that reads them — upgrade if login-time latency or read
// volume actually becomes a problem, not preemptively.
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
      <Suspense fallback={<AppSkeleton />}>
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
            path="/superadmin/overview"
            element={
              <RequireAuth allow={['superadmin']}>
                <SuperAdminOverviewPage />
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
          <Route
            path="/superadmin/users"
            element={
              <RequireAuth allow={['superadmin']}>
                <SuperAdminUsersPage />
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/departments"
            element={
              <RequireAuth allow={['superadmin']}>
                <SuperAdminDepartmentsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/sla"
            element={
              <RequireAuth allow={['superadmin']}>
                <SuperAdminSLAPage />
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/analytics"
            element={
              <RequireAuth allow={['superadmin']}>
                <SuperAdminAnalyticsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/security"
            element={
              <RequireAuth allow={['superadmin']}>
                <SuperAdminSecurityPage />
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/audit-log"
            element={
              <RequireAuth allow={['superadmin']}>
                <SuperAdminAuditLogPage />
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/activity"
            element={
              <RequireAuth allow={['superadmin']}>
                <SuperAdminActivityPage />
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/settings"
            element={
              <RequireAuth allow={['superadmin']}>
                <SuperAdminSettingsPage />
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
      </Suspense>
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
