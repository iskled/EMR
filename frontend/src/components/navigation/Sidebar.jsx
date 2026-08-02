import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { hasPermission } from '../../permissions/permissions'
import { useClinicSettings } from '../../context/ClinicSettingsContext'

const menu = [
  { label: 'Dashboard', path: '/dashboard', permission: 'dashboard.view' },
  { label: 'Patients', path: '/patients', permission: 'patients.view' },
  { label: 'Appointments', path: '/appointments', permission: 'appointments.view' },
  { label: 'Orthodontics', path: '/orthodontics', permission: 'orthodontics.view' },
  { label: 'Inventory', path: '/inventory', permission: 'inventory.view' },
  { label: 'Reports', path: '/reports', permission: 'reports.view' },
  { label: 'Tasks', path: '/tasks', permission: 'tasks.view' },
  { label: 'Billing', path: '/billing', permission: 'billing.view' },
  { label: 'Settings', path: '/settings', permission: 'settings.view' }
]

const administrationMenu = [
  { label: 'Users', path: '/administration/users', permission: 'users.manage' },
  { label: 'Security', path: '/security', permission: 'security.view' },
  { label: 'Audit Logs', path: '/audit', permission: 'audit.view' },
  { label: 'Clinic Branding', path: '/administration/branding', permission: 'users.manage' },
  { label: 'Archived Reminders', path: '/administration/archived-reminders', permission: 'users.manage' },
]

export default function Sidebar() {
  const { user } = useAuth()
  const {settings}=useClinicSettings()
  const location = useLocation()
  const visibleMenu = menu.filter(item => hasPermission(user, item.permission))
  const visibleAdministration = administrationMenu.filter(item => hasPermission(user, item.permission))
  const isAdministrationActive = visibleAdministration.some(item => location.pathname === item.path)
  const [administrationOpen, setAdministrationOpen] = useState(isAdministrationActive)

  useEffect(() => {
    if (isAdministrationActive) {
      setAdministrationOpen(true)
    }
  }, [isAdministrationActive])

  return (
    <aside className="hidden w-56 shrink-0 bg-slate-900 text-white min-h-screen md:block xl:w-64">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">{settings.logo_url?<img src={settings.logo_url} alt="" className="h-12 w-12 rounded object-contain"/>:<span className="flex h-12 w-12 items-center justify-center rounded bg-blue-600 font-bold">BS</span>}<h1 className="text-2xl font-bold">{settings.short_name}</h1></div>
        <p className="text-sm text-slate-400 mt-1">
          {settings.tagline}
        </p>
      </div>

      <nav className="p-4 space-y-2">
        {visibleMenu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-blue-600'
                  : 'hover:bg-slate-800'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
        {visibleAdministration.length > 0 && (
          <div className="pt-4">
            <button
              type="button"
              onClick={() => setAdministrationOpen(open => !open)}
              aria-expanded={administrationOpen}
              className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide transition ${
                isAdministrationActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span>Administration</span>
              <span aria-hidden="true">{administrationOpen ? '−' : '+'}</span>
            </button>
            {administrationOpen && (
              <div className="mt-2 space-y-2 pl-3">
                {visibleAdministration.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `block px-4 py-3 rounded-lg transition ${
                        isActive
                          ? 'bg-blue-600'
                          : 'hover:bg-slate-800'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  )
}
