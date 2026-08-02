import { useAuth } from '../auth/AuthContext'
import { hasPermission } from './permissions'

export default function Can({ permission, children, fallback = null }) {
  const { user } = useAuth()
  return hasPermission(user, permission) ? children : fallback
}
