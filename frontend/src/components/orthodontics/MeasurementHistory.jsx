import { formatLabel, MEASUREMENT_FIELDS } from '../../services/orthodontics.service'

export default function MeasurementHistory({ visits = [] }) {
  const measuredVisits = visits.filter(visit => visit.measurements && Object.keys(visit.measurements).length)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900">Measurement History</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2 text-left">Date</th>
              {MEASUREMENT_FIELDS.slice(0, 6).map(field => (
                <th key={field} className="px-3 py-2 text-left">{formatLabel(field)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {measuredVisits.map(visit => (
              <tr key={visit.id}>
                <td className="py-2 font-medium">{visit.visit_date}</td>
                {MEASUREMENT_FIELDS.slice(0, 6).map(field => (
                  <td key={field} className="px-3 py-2">{visit.measurements[field] || '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!measuredVisits.length && (
          <p className="py-6 text-center text-sm text-gray-500">No measurement history recorded.</p>
        )}
      </div>
    </div>
  )
}
