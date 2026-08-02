import AppointmentStatusBadge from './AppointmentStatusBadge'

const trackedStatuses = [
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]

function MetricCard({ label, value, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {children}
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

export default function AppointmentMetrics({
  appointments = [],
  dentists = [],
  selectedDate,
}) {
  const counts = trackedStatuses.reduce((acc, status) => {
    acc[status] = appointments.filter(item => item.status === status).length
    return acc
  }, {})

  const workload = dentists
    .map(dentist => ({
      dentist,
      count: appointments.filter(item => String(item.dentist) === String(dentist.id))
        .length,
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label={`Appointments ${selectedDate ? `on ${selectedDate}` : 'today'}`}
          value={appointments.length}
        />
        <MetricCard label="Scheduled" value={counts.scheduled || 0}>
          <AppointmentStatusBadge status="scheduled" compact />
        </MetricCard>
        <MetricCard label="Confirmed" value={counts.confirmed || 0}>
          <AppointmentStatusBadge status="confirmed" compact />
        </MetricCard>
        <MetricCard label="Completed" value={counts.completed || 0}>
          <AppointmentStatusBadge status="completed" compact />
        </MetricCard>
        <MetricCard label="Cancelled" value={counts.cancelled || 0}>
          <AppointmentStatusBadge status="cancelled" compact />
        </MetricCard>
        <MetricCard label="No Show" value={counts.no_show || 0}>
          <AppointmentStatusBadge status="no_show" compact />
        </MetricCard>
        <MetricCard label="In Progress" value={counts.in_progress || 0}>
          <AppointmentStatusBadge status="in_progress" compact />
        </MetricCard>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Dentist Workload</p>
          <div className="mt-3 space-y-2">
            {workload.slice(0, 3).map(({ dentist, count }) => (
              <div key={dentist.id} className="flex justify-between text-sm">
                <span className="truncate text-gray-700">
                  {dentist.first_name || dentist.last_name
                    ? `${dentist.first_name || ''} ${dentist.last_name || ''}`.trim()
                    : dentist.email}
                </span>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            ))}
            {!workload.length && (
              <p className="text-sm text-gray-500">No active dentists found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
