import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import RequireAuth from './components/RequireAuth';

// Every role lands on the same dashboard — it picks its data source from
// user.role. Keeping the paths distinct matches HOME_FOR_ROLE in AuthContext.
const DASHBOARD_PATHS = [
  '/founder/dashboard',
  '/hr/dashboard',
  '/it/dashboard',
  '/employee/dashboard',
];

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          {DASHBOARD_PATHS.map((path) => (
            <Route
              key={path}
              path={path}
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
