import { formatLabel } from '../../services/orthodontics.service'

const config = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  retention: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  completed: 'bg-slate-100 text-slate-700 border-slate-300',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  archived: 'bg-rose-50 text-rose-700 border-rose-200',
}

export default function CaseStatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${config[status] || config.active}`}>
      {formatLabel(status)}
    </span>
  )
}
