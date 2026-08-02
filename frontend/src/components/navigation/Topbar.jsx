
import { useAuth } from '../../auth/AuthContext'
import { getUserDisplayName } from '../../utils/user'
import { useClinicSettings } from '../../context/ClinicSettingsContext'

export default function Topbar() {
  const { logout, user } = useAuth()
  const {settings}=useClinicSettings()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-800">
          {settings.clinic_name}
        </h2>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">
              {getUserDisplayName(user)}
            </p>

            <p className="text-xs text-gray-500">
              <span className="capitalize">{user?.role || ''}</span>
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
