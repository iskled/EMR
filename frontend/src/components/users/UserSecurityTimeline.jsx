export default function UserSecurityTimeline({ securityHistory, auditHistory }) {
  const loginItems = securityHistory?.login_attempts || []
  const alertItems = securityHistory?.alerts || []
  const auditItems = auditHistory || []

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-gray-900">Security history</h3>
      <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">Login attempts</p>
          <div className="space-y-2">
            {loginItems.map(item => (
              <div key={item.id} className="rounded-md bg-gray-50 p-2 text-sm">
                <span className={item.success ? 'font-semibold text-green-700' : 'font-semibold text-red-700'}>{item.success ? 'Success' : 'Failure'}</span>
                <span className="ml-2 text-gray-600">{new Date(item.created_at).toLocaleString()}</span>
                {item.failure_reason && <p className="text-xs text-gray-500">{item.failure_reason}</p>}
              </div>
            ))}
            {!loginItems.length && <p className="text-sm text-gray-500">No login history.</p>}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">Audit history</p>
          <div className="space-y-2">
            {auditItems.map(item => (
              <div key={item.id} className="rounded-md bg-gray-50 p-2 text-sm">
                <span className="font-semibold text-gray-900">{item.action}</span>
                <span className="ml-2 text-gray-600">{new Date(item.timestamp).toLocaleString()}</span>
              </div>
            ))}
            {!auditItems.length && <p className="text-sm text-gray-500">No audit history.</p>}
          </div>
        </div>
      </div>
      {!!alertItems.length && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-gray-700">Alerts</p>
          <div className="space-y-2">
            {alertItems.map(item => <p key={item.id} className="rounded-md bg-red-50 p-2 text-sm text-red-800">{item.message}</p>)}
          </div>
        </div>
      )}
    </section>
  )
}
