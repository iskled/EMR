import AppointmentStatusBadge from './AppointmentStatusBadge'

export default function AppointmentTimeline({
  appointments = [],
  currentAppointmentId,
  onOpen,
}) {
  const history = appointments
    .filter(item => item.id !== currentAppointmentId)
    .slice(0, 6)

  return (
    <section>
      <h3 className="font-semibold mb-3">Patient Appointment History</h3>
      {history.length ? (
        <div className="space-y-2">
          {history.map(item => (
            <button
              type="button"
              key={item.id}
              onClick={() => onOpen?.(item)}
              className="w-full rounded-lg border border-gray-200 p-3 text-left hover:border-blue-300"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-gray-900">
                  {item.scheduled_date} · {item.start_time}
                </p>
                <AppointmentStatusBadge status={item.status} compact />
              </div>
              <p className="text-sm text-gray-500">{item.type_name}</p>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-gray-200 p-3 text-sm text-gray-500">
          No other appointments found for this patient in the loaded schedule.
        </p>
      )}
    </section>
  )
}
