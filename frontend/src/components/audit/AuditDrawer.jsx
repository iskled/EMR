import AuditDiffViewer from './AuditDiffViewer'

export default function AuditDrawer({ event, onClose }) {
  if (!event) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <aside className="h-full w-full max-w-4xl overflow-y-auto bg-gray-50 p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{event.action}</h2>
            <p className="text-sm text-gray-500">{event.event_id}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold">Close</button>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm md:grid-cols-3">
          <div><span className="text-gray-500">User</span><p className="font-semibold">{event.user_email || 'System'}</p></div>
          <div><span className="text-gray-500">Role</span><p className="font-semibold">{event.user_role || '-'}</p></div>
          <div><span className="text-gray-500">Timestamp</span><p className="font-semibold">{new Date(event.timestamp).toLocaleString()}</p></div>
          <div><span className="text-gray-500">Endpoint</span><p className="font-semibold break-all">{event.request_method} {event.endpoint}</p></div>
          <div><span className="text-gray-500">IP</span><p className="font-semibold">{event.ip_address || '-'}</p></div>
          <div><span className="text-gray-500">Correlation</span><p className="font-semibold break-all">{event.correlation_id || '-'}</p></div>
          <div><span className="text-gray-500">Hash</span><p className="font-semibold break-all">{event.event_hash}</p></div>
          <div><span className="text-gray-500">Previous hash</span><p className="font-semibold break-all">{event.previous_hash || '-'}</p></div>
          <div><span className="text-gray-500">Failure</span><p className="font-semibold">{event.failure_reason || '-'}</p></div>
        </div>
        <AuditDiffViewer event={event} />
      </aside>
    </div>
  )
}
