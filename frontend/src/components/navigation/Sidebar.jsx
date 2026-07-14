import { NavLink } from 'react-router-dom'

const menu = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Patients', path: '/patients' },
  { label: 'Appointments', path: '/appointments' },
  { label: 'Orthodontics', path: '/orthodontics' },
  { label: 'Billing', path: '/billing' },
  { label: 'Settings', path: '/settings' }
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold">BSDC EMR</h1>
        <p className="text-sm text-slate-400 mt-1">
          Dental Practice Platform
        </p>
      </div>

      <nav className="p-4 space-y-2">
        {menu.map((item) => (
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
      </nav>
    </aside>
  )
}
