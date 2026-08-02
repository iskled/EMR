import { acknowledgeAlert, resolveAlert } from '../../services/inventory.service'

export default function InventoryAlerts({ alerts = [], onChanged }) {
  async function ack(alert) {
    await acknowledgeAlert(alert.id)
    await onChanged?.()
  }
  async function resolve(alert) {
    await resolveAlert(alert.id)
    await onChanged?.()
  }
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="font-semibold">Inventory Alerts</h3>
      <div className="mt-4 space-y-3">
        {alerts.map(alert => (
          <div key={alert.id} className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-semibold">{alert.alert_type}</p><p>{alert.message}</p><p className="text-xs">Status: {alert.status}</p></div>
              <div className="flex gap-2">
                {alert.status === 'open' && <button className="font-semibold text-blue-700 hover:underline" onClick={() => ack(alert)}>Acknowledge</button>}
                {alert.status !== 'resolved' && <button className="font-semibold text-emerald-700 hover:underline" onClick={() => resolve(alert)}>Resolve</button>}
              </div>
            </div>
          </div>
        ))}
        {!alerts.length && <p className="text-sm text-gray-500">No open alerts.</p>}
      </div>
    </div>
  )
}
