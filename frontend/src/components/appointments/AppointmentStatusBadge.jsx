const STATUS_CONFIG = {
  scheduled: {
    label: 'Scheduled',
    classes: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  confirmed: {
    label: 'Confirmed',
    classes: 'bg-green-100 text-green-800 border-green-200',
  },
  in_progress: {
    label: 'In Progress',
    classes: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  completed: {
    label: 'Completed',
    classes: 'bg-gray-100 text-gray-800 border-gray-300',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-red-100 text-red-800 border-red-200',
  },
  no_show: {
    label: 'No Show',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
}

export default function AppointmentStatusBadge({ status }) {
  const config =
    STATUS_CONFIG[status] ||
    {
      label: status || 'Unknown',
      classes: 'bg-gray-100 text-gray-700 border-gray-300',
    }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${config.classes}`}
    >
      {config.label}
    </span>
  )
}
