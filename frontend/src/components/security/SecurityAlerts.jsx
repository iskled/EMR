export default function SecurityAlerts({ alerts, onAcknowledge, onResolve }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Security alerts</h2>
      <div className="mt-4 space-y-3">
        {alerts.map(alert => (
          <div key={alert.id} className="flex flex-col gap-3 rounded-md border border-gray-200 p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-gray-900">{alert.message}</p>
              <p className="text-sm text-gray-500">{alert.alert_type} - {alert.severity} - {alert.status}</p>
            </div>
            {alert.status === 'open' && (
              <div className="flex gap-2">
                <button type="button" onClick={() => onAcknowledge(alert)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold">Acknowledge</button>
                <button type="button" onClick={() => onResolve(alert)} className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">Resolve</button>
              </div>
            )}
          </div>
        ))}
        {!alerts.length && <p className="text-sm text-gray-500">No security alerts.</p>}
      </div>
    </section>
  )
}
