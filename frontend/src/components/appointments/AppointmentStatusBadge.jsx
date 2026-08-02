const STATUS_CONFIG = {
  scheduled: {
    label: 'Scheduled',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  confirmed: {
    label: 'Confirmed',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  in_progress: {
    label: 'In Progress',
    classes: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  completed: {
    label: 'Completed',
    classes: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  no_show: {
    label: 'No Show',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
  },
}

export function statusLabel(status) {
  return STATUS_CONFIG[status]?.label || status || 'Unknown'
}

export default function AppointmentStatusBadge({ status, compact = false }) {
  const config =
    STATUS_CONFIG[status] ||
    {
      label: status || 'Unknown',
      classes: 'bg-gray-100 text-gray-700 border-gray-300',
    }

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${config.classes} ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      }`}
    >
      {config.label}
    </span>
  )
}
