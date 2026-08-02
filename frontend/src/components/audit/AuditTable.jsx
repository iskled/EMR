export default function AuditTable({ events, onOpen }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Resource</th>
            <th className="px-4 py-3">Module</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {events.map(event => (
            <tr key={event.id} className="cursor-pointer hover:bg-gray-50" onClick={() => onOpen(event)}>
              <td className="px-4 py-3">{new Date(event.timestamp).toLocaleString()}</td>
              <td className="px-4 py-3">{event.user_email || 'System'}</td>
              <td className="px-4 py-3">{event.action}</td>
              <td className="px-4 py-3">{event.resource_type}:{event.resource_id}</td>
              <td className="px-4 py-3">{event.source_module}</td>
              <td className={`px-4 py-3 font-semibold ${event.success ? 'text-green-700' : 'text-red-700'}`}>{event.success ? 'Success' : 'Failure'}</td>
            </tr>
          ))}
          {!events.length && (
            <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-500">No audit events found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
