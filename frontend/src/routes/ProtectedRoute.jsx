import { Navigate } from 'react-router-dom'
import { isTokenExpired, useAuth } from '../auth/AuthContext'

export default function ProtectedRoute({ children }) {
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

  return children
}
