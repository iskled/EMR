import { Navigate } from 'react-router-dom'
import { isTokenExpired, useAuth } from '../auth/AuthContext'
import DashboardLayout from '../layouts/DashboardLayout'
import { hasPermission } from '../permissions/permissions'

export default function ProtectedRoute({ children, permission }) {
  const { initializing, user } = useAuth()
  const token = localStorage.getItem('accessToken')

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-600">
        Loading...
      </div>
    )
  }

  if (!token || isTokenExpired(token) || !user) {
    return <Navigate to="/login" replace />
  }

  if (permission && !hasPermission(user, permission)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
}
