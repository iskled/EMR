const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }
export default function DashboardHeader({ user, data, refreshing, onRefresh }) {
  const name = getUserDisplayName(user)
  return <header className="rounded-2xl bg-gradient-to-r from-slate-900 to-blue-900 p-6 text-white shadow-lg">
    <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm text-blue-200">{greeting()},</p><h1 className="mt-1 text-2xl font-bold md:text-3xl">{name}</h1><p className="mt-2 capitalize text-slate-300">{data.role} · {new Date(`${data.date}T12:00:00`).toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p></div>
    <div className="text-right"><p className="text-sm text-slate-300">{data.appointments.total} appointments scheduled today</p><p className="mt-1 text-xs text-slate-400">Last refreshed {new Date(data.generated_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p><button type="button" onClick={onRefresh} disabled={refreshing} aria-label="Refresh dashboard" className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60">{refreshing ? 'Refreshing…' : 'Refresh'}</button></div></div>
  </header>
}
import {getUserDisplayName} from '../../utils/user'
