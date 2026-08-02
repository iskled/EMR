import { formatLabel } from '../../services/orthodontics.service'

export default function VisitTimeline({ events = [], filter = 'all', onVisitClick }) {
  const filtered = filter === 'all' ? events : events.filter(event => event.event_type === filter)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900">Visit Timeline</h3>
      <div className="mt-4 space-y-3">
        {filtered.map(event => (
          <button
            key={event.id}
            type="button"
            onClick={() => event.event_type === 'visit' && onVisitClick?.(event)}
            className="w-full rounded-lg border border-gray-200 p-3 text-left hover:border-blue-300"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-gray-900">{event.title}</p>
              <span className="text-sm text-gray-500">{event.date}</span>
            </div>
            <p className="text-sm text-gray-600">{event.subtitle || formatLabel(event.event_type)}</p>
            {event.meta?.dentist && (
              <p className="mt-1 text-xs text-gray-500">Treating dentist: {event.meta.dentist}</p>
            )}
          </button>
        ))}
        {!filtered.length && (
          <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No timeline events found.
          </p>
        )}
      </div>
    </div>
  )
}
