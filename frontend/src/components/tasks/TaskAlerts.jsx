export default function TaskAlerts({ alerts, onAction }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Task alerts</h2>
      <div className="mt-4 space-y-3">
        {alerts.map(alert => (
          <div key={alert.id} className="flex flex-col gap-3 rounded-md border border-gray-200 p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{alert.task_title}</p>
              <p className="text-sm text-gray-600">{alert.message}</p>
              <p className="mt-1 text-xs capitalize text-gray-500">{alert.alert_type.replaceAll('_', ' ')} - {alert.status}</p>
            </div>
            {alert.status === 'open' && (
              <div className="flex gap-2">
                <button type="button" onClick={() => onAction(alert, 'acknowledge')} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700">Acknowledge</button>
                <button type="button" onClick={() => onAction(alert, 'dismiss')} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700">Dismiss</button>
              </div>
            )}
          </div>
        ))}
        {!alerts.length && <p className="text-sm text-gray-500">No active task alerts.</p>}
      </div>
    </section>
  )
}
