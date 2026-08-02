import AppointmentStatusBadge from './AppointmentStatusBadge'

function preferenceText(entry) {
  const days = Array.isArray(entry.preferred_days) && entry.preferred_days.length
    ? entry.preferred_days.join(', ')
    : 'Any day'
  const time = entry.preferred_time_from && entry.preferred_time_to
    ? `${entry.preferred_time_from} - ${entry.preferred_time_to}`
    : 'Any time'
  return `${days}; ${time}`
}

export default function WaitingListPanel({
  entries = [],
  loading = false,
  onSchedule,
  onRefresh,
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Waiting List</h2>
          <p className="text-sm text-gray-500">Waiting patients ready to schedule</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="max-h-[420px] overflow-y-auto p-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading waiting list...</p>
        ) : entries.length ? (
          <div className="space-y-3">
            {entries.map(entry => (
              <div key={entry.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{entry.patient_name}</p>
                    <p className="text-sm text-gray-500">{entry.type_name}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold uppercase text-amber-700">
                    {entry.priority}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{preferenceText(entry)}</p>
                {entry.notes && (
                  <p className="mt-1 text-sm text-gray-500">{entry.notes}</p>
                )}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <AppointmentStatusBadge status={entry.status} compact />
                  <button
                    type="button"
                    onClick={() => onSchedule?.(entry)}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No waiting patients found.</p>
        )}
      </div>
    </div>
  )
}
