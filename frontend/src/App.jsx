import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './routes/ProtectedRoute'

import AppointmentsPage from './pages/AppointmentsPage'
import AuditLogPage from './pages/AuditLogPage'
import BillingPage from './pages/BillingPage'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import LoginPage from './pages/LoginPage'
import OrthodonticsPage from './pages/OrthodonticsPage'
import PatientsPage from './pages/PatientsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import TasksPage from './pages/TasksPage'
import SecurityPage from './pages/SecurityPage'
import UserManagementPage from './pages/UserManagementPage'
import ClinicBrandingPage from './pages/ClinicBrandingPage'
import ArchivedRemindersPage from './pages/ArchivedRemindersPage'

const DentistAccountsPage = lazy(() => import('./pages/DentistAccountsPage'))

function protectedPage(page, permission) {
  return (
    <ProtectedRoute permission={permission}>
      {page}
    </ProtectedRoute>
  )
}

function lazyPage(page) {
  return (
    <Suspense fallback={<div className="rounded-lg border border-gray-200 bg-white p-8 text-gray-500">Loading...</div>}>
      {page}
    </Suspense>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={protectedPage(<DashboardPage />, 'dashboard.view')} />
      <Route path="/patients" element={protectedPage(<PatientsPage />, 'patients.view')} />
      <Route path="/appointments" element={protectedPage(<AppointmentsPage />, 'appointments.view')} />
      <Route path="/inventory" element={protectedPage(<InventoryPage />, 'inventory.view')} />
      <Route path="/billing" element={protectedPage(<BillingPage />, 'billing.view')} />
      <Route path="/orthodontics" element={protectedPage(<OrthodonticsPage />, 'orthodontics.view')} />
      <Route path="/reports" element={protectedPage(<ReportsPage />, 'reports.view')} />
      <Route path="/tasks" element={protectedPage(<TasksPage />, 'tasks.view')} />
      <Route path="/tasks/new" element={protectedPage(<TasksPage />, 'tasks.view')} />
      <Route path="/audit" element={protectedPage(<AuditLogPage />, 'audit.view')} />
      <Route path="/security" element={protectedPage(<SecurityPage />, 'security.view')} />
      <Route path="/administration/users" element={protectedPage(<UserManagementPage />, 'users.manage')} />
      <Route path="/administration/branding" element={protectedPage(<ClinicBrandingPage />, 'users.manage')} />
      <Route path="/administration/archived-reminders" element={protectedPage(<ArchivedRemindersPage />, 'users.manage')} />
      <Route path="/staff/dentists" element={protectedPage(lazyPage(<DentistAccountsPage />), 'dentists.manage')} />
      <Route path="/administration/dentists" element={protectedPage(lazyPage(<DentistAccountsPage />), 'dentists.manage')} />
      <Route path="/settings" element={protectedPage(<SettingsPage />, 'settings.view')} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
