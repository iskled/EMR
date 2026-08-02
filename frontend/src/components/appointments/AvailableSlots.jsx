export default function AvailableSlots({
  slots,
  loading = false,
  selectedStart,
  onSelect,
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-500">
        Loading available slots...
      </div>
    )
  }

  if (!slots) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-500">
        Select a dentist, date, and duration to check availability.
      </div>
    )
  }

  if (!slots.length) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-500">
        No slots returned for this day.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Availability</p>
        <div className="flex gap-3 text-xs text-gray-500">
          <span>Open</span>
          <span>Occupied</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
        {slots.map(slot => (
          <button
            key={`${slot.start}-${slot.end}`}
            type="button"
            disabled={!slot.available}
            title={slot.occupied_by || `${slot.start} to ${slot.end}`}
            onClick={() => onSelect?.(slot)}
            className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
              selectedStart === slot.start
                ? 'border-blue-600 bg-blue-50 text-blue-800'
                : slot.available
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400'
                  : 'border-rose-200 bg-rose-50 text-rose-700 cursor-not-allowed'
            }`}
          >
            <span className="block font-semibold">
              {slot.start} - {slot.end}
            </span>
            <span className="block truncate">
              {slot.available ? 'Available' : slot.occupied_by}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
