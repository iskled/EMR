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
    return (
      <DashboardLayout>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-2 text-sm">You do not have permission to open this workspace.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
}
