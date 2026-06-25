import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Layout } from './components/Layout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ActivateAccountPage } from './pages/ActivateAccountPage';

// Super Admin Pages
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';
import { GymOwnersDirectory } from './pages/superadmin/GymOwnersDirectory';
import { LeadManagement } from './pages/superadmin/LeadManagement';
import { AuditLogs } from './pages/superadmin/AuditLogs';
import { SubscriptionManagement } from './pages/superadmin/SubscriptionManagement';
import { CouponManagement } from './pages/superadmin/CouponManagement';

// Gym Owner Pages
import { GymOwnerDashboard } from './pages/gymowner/GymOwnerDashboard';
import { MemberManagement } from './pages/gymowner/MemberManagement';
import { MemberProfile } from './pages/gymowner/MemberProfile';
import { PendingRecoveryDashboard } from './pages/gymowner/PendingRecoveryDashboard';
import { MembershipPlans } from './pages/gymowner/MembershipPlans';
import { PaymentsTracker } from './pages/gymowner/PaymentsTracker';
import { TrainerManagement } from './pages/gymowner/TrainerManagement';
import { WorkoutDietPlanner } from './pages/gymowner/WorkoutDietPlanner';
import { QRAttendanceSimulator } from './pages/gymowner/QRAttendanceSimulator';
import { GymBrandingSettings } from './pages/gymowner/GymBrandingSettings';
import { AttendanceHistory } from './pages/gymowner/AttendanceHistory';

// Helper Dashboard Dispatcher
const DashboardDispatcher: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'super_admin') {
    return <SuperAdminDashboard />;
  }
  return <GymOwnerDashboard />;
};

// Helper Route Guard
const RoleGuard: React.FC<{ allowed: 'super_admin' | 'gym_owner'; children: React.ReactNode }> = ({ allowed, children }) => {
  const { user } = useAuth();
  if (user?.role !== allowed) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/activate-account" element={<ActivateAccountPage />} />

              {/* Authenticated Dashboard Routes */}
              <Route path="/app" element={<Layout />}>
                {/* Unified Dashboard Route */}
                <Route index element={<DashboardDispatcher />} />

                {/* Super Admin Area */}
                <Route
                  path="owners"
                  element={
                    <RoleGuard allowed="super_admin">
                      <GymOwnersDirectory />
                    </RoleGuard>
                  }
                />
                <Route
                  path="leads"
                  element={
                    <RoleGuard allowed="super_admin">
                      <LeadManagement />
                    </RoleGuard>
                  }
                />
                <Route
                  path="audits"
                  element={
                    <RoleGuard allowed="super_admin">
                      <AuditLogs />
                    </RoleGuard>
                  }
                />
                <Route
                  path="subscription"
                  element={
                    <RoleGuard allowed="super_admin">
                      <SubscriptionManagement />
                    </RoleGuard>
                  }
                />
                <Route
                  path="coupons"
                  element={
                    <RoleGuard allowed="super_admin">
                      <CouponManagement />
                    </RoleGuard>
                  }
                />

                {/* Gym Owner Area */}
                <Route
                  path="members"
                  element={
                    <RoleGuard allowed="gym_owner">
                      <MemberManagement />
                    </RoleGuard>
                  }
                />
                <Route
                  path="members/:id"
                  element={
                    <RoleGuard allowed="gym_owner">
                      <MemberProfile />
                    </RoleGuard>
                  }
                />
                <Route
                  path="recovery"
                  element={
                    <RoleGuard allowed="gym_owner">
                      <PendingRecoveryDashboard />
                    </RoleGuard>
                  }
                />
                <Route
                  path="plans"
                  element={
                    <RoleGuard allowed="gym_owner">
                      <MembershipPlans />
                    </RoleGuard>
                  }
                />
                <Route
                  path="payments"
                  element={
                    <RoleGuard allowed="gym_owner">
                      <PaymentsTracker />
                    </RoleGuard>
                  }
                />
                <Route
                  path="trainers"
                  element={
                    <RoleGuard allowed="gym_owner">
                      <TrainerManagement />
                    </RoleGuard>
                  }
                />
                <Route
                  path="workouts"
                  element={
                    <RoleGuard allowed="gym_owner">
                      <WorkoutDietPlanner />
                    </RoleGuard>
                  }
                />
                <Route
                  path="attendance"
                  element={
                    <RoleGuard allowed="gym_owner">
                      <QRAttendanceSimulator />
                    </RoleGuard>
                  }
                />
                <Route
                  path="attendance-history"
                  element={
                    <RoleGuard allowed="gym_owner">
                      <AttendanceHistory />
                    </RoleGuard>
                  }
                />
                <Route
                  path="branding"
                  element={
                    <RoleGuard allowed="gym_owner">
                      <GymBrandingSettings />
                    </RoleGuard>
                  }
                />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};
