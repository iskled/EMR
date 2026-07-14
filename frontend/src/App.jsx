import { Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './routes/ProtectedRoute'

import AppointmentsPage from './pages/AppointmentsPage'
import BillingPage from './pages/BillingPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import OrthodonticsPage from './pages/OrthodonticsPage'
import PatientsPage from './pages/PatientsPage'
import SettingsPage from './pages/SettingsPage'

function protectedPage(page) {
  return (
    <ProtectedRoute>
      {page}
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={protectedPage(<DashboardPage />)} />
      <Route path="/patients" element={protectedPage(<PatientsPage />)} />
      <Route path="/appointments" element={protectedPage(<AppointmentsPage />)} />
      <Route path="/billing" element={protectedPage(<BillingPage />)} />
      <Route path="/orthodontics" element={protectedPage(<OrthodonticsPage />)} />
      <Route path="/settings" element={protectedPage(<SettingsPage />)} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
