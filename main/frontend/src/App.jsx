import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import HRComplaintForm from './pages/HRComplaintForm';
import ITComplaintForm from './pages/ITComplaintForm';
import HRDashboard from './pages/HRDashboard';
import ITDashboard from './pages/ITDashboard';
import FounderDashboard from './pages/FounderDashboard';
import TokenSearch from './pages/TokenSearch';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1e1e2e', color: '#f1f1f3', border: '1px solid rgba(255,255,255,0.1)' },
          }}
        />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Employee */}
          <Route path="/employee/dashboard" element={
            <ProtectedRoute roles={['employee', 'hr', 'it', 'founder']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          } />
          <Route path="/employee/complaint/hr" element={
            <ProtectedRoute roles={['employee', 'hr', 'it', 'founder']}>
              <HRComplaintForm />
            </ProtectedRoute>
          } />
          <Route path="/employee/complaint/it" element={
            <ProtectedRoute roles={['employee', 'hr', 'it', 'founder']}>
              <ITComplaintForm />
            </ProtectedRoute>
          } />

          {/* HR Staff */}
          <Route path="/hr/dashboard" element={
            <ProtectedRoute roles={['hr', 'founder']}>
              <HRDashboard />
            </ProtectedRoute>
          } />

          {/* IT Staff */}
          <Route path="/it/dashboard" element={
            <ProtectedRoute roles={['it', 'founder']}>
              <ITDashboard />
            </ProtectedRoute>
          } />

          {/* Founder */}
          <Route path="/founder/dashboard" element={
            <ProtectedRoute roles={['founder']}>
              <FounderDashboard />
            </ProtectedRoute>
          } />

          {/* Token Search */}
          <Route path="/search" element={
            <ProtectedRoute roles={['employee', 'hr', 'it', 'founder']}>
              <TokenSearch />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
