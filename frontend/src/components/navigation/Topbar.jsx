
import { useAuth } from '../../auth/AuthContext'

export default function Topbar() {
  const { logout, user } = useAuth()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Enterprise Dental EMR
        </h2>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">
              {user?.email || 'Administrator'}
            </p>

            <p className="text-xs text-gray-500">
              System Administrator
            </p>
          </div>

          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
