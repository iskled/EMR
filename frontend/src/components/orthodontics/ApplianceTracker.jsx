import { APPLIANCE_FIELDS, formatLabel } from '../../services/orthodontics.service'
import ApplianceHistory from './ApplianceHistory'

export default function ApplianceTracker({ orthoCase, visits = [] }) {
  const appliances = orthoCase?.appliances || {}

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900">Appliance Tracking</h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {APPLIANCE_FIELDS.map(field => (
            <div key={field} className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-semibold uppercase text-gray-500">{formatLabel(field)}</p>
              <p className="mt-1 text-sm text-gray-900">{appliances[field] || 'Not recorded'}</p>
            </div>
          ))}
        </div>
      </div>
      <ApplianceHistory visits={visits} />
    </div>
  )
}
