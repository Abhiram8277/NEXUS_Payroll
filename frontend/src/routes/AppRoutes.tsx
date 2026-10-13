import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardLayout } from '../components/layout/DashboardLayout';

// Auth pages
import { LoginPage } from '../pages/auth/LoginPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { NotFoundPage } from '../pages/NotFoundPage';

// Admin pages
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { EmployeesPage } from '../pages/admin/EmployeesPage';
import { EmployeeDetailPage } from '../pages/admin/EmployeeDetailPage';
import { SalaryStructurePage } from '../pages/admin/SalaryStructurePage';
import { AttendancePage } from '../pages/admin/AttendancePage';
import { LeavesPage } from '../pages/admin/LeavesPage';
import { PayrollPage } from '../pages/admin/PayrollPage';
import { MastersPage } from '../pages/admin/MastersPage';
import { ReportsPage } from '../pages/admin/ReportsPage';
import { CompanySettingsPage } from '../pages/admin/CompanySettingsPage';

// HR pages
import { HrDashboardPage } from '../pages/hr/HrDashboardPage';

// Employee pages
import { EmployeeDashboardPage } from '../pages/employee/EmployeeDashboardPage';
import { MyProfilePage } from '../pages/employee/MyProfilePage';
import { MySalaryPage } from '../pages/employee/MySalaryPage';
import { MyPayslipsPage } from '../pages/employee/MyPayslipsPage';
import { MyAttendancePage } from '../pages/employee/MyAttendancePage';
import { MyLeavesPage } from '../pages/employee/MyLeavesPage';
import { MyDocumentsPage } from '../pages/employee/MyDocumentsPage';

export const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  const getDefaultRedirect = () => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin/dashboard';
    if (user.role === 'HR') return '/hr/dashboard';
    return '/employee/dashboard';
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />

      {/* Admin Module Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="employees/:id" element={<EmployeeDetailPage />} />
        <Route path="salary" element={<SalaryStructurePage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="leaves" element={<LeavesPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="masters" element={<MastersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<CompanySettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* HR Module Routes */}
      <Route
        path="/hr/*"
        element={
          <ProtectedRoute allowedRoles={['HR', 'ADMIN']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<HrDashboardPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="employees/:id" element={<EmployeeDetailPage />} />
        <Route path="salary" element={<SalaryStructurePage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="leaves" element={<LeavesPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Employee Self-Service Routes */}
      <Route
        path="/employee/*"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE', 'ADMIN', 'HR']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<EmployeeDashboardPage />} />
        <Route path="profile" element={<MyProfilePage />} />
        <Route path="salary" element={<MySalaryPage />} />
        <Route path="payslips" element={<MyPayslipsPage />} />
        <Route path="attendance" element={<MyAttendancePage />} />
        <Route path="leaves" element={<MyLeavesPage />} />
        <Route path="documents" element={<MyDocumentsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Fallback 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
