export default function TasksDashboard({ metrics }) {
  const statusRows = metrics?.by_status || []
  const typeRows = metrics?.by_type || []
  const personalRows = [
    ['Pending Acceptance', metrics?.my_pending_acceptance ?? 0],
    ['Accepted', metrics?.my_accepted ?? 0],
    ['In Progress', metrics?.my_in_progress ?? 0],
    ['Waiting for Vendor', metrics?.my_waiting_for_vendor ?? 0],
    ['Waiting for Staff', metrics?.my_waiting_for_staff ?? 0],
    ['Resolved', metrics?.my_resolved ?? 0],
    ['Closed Today', metrics?.my_closed_today ?? 0],
    ['Overdue', metrics?.my_overdue ?? 0],
  ]

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Assigned Work</h2>
        <div className="mt-4 space-y-3">
          {personalRows.map(([label, count]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{label}</span>
              <span className="font-semibold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Status Workload</h2>
        <div className="mt-4 space-y-3">
          {statusRows.map(row => (
            <div key={row.status} className="flex items-center justify-between text-sm">
              <span className="capitalize text-gray-700">{row.status.replaceAll('_', ' ')}</span>
              <span className="font-semibold text-gray-900">{row.count}</span>
            </div>
          ))}
          {!statusRows.length && <p className="text-sm text-gray-500">No task status data yet.</p>}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Workflow Mix</h2>
        <div className="mt-4 space-y-3">
          {typeRows.map(row => (
            <div key={row.task_type} className="flex items-center justify-between text-sm">
              <span className="capitalize text-gray-700">{row.task_type.replaceAll('_', ' ')}</span>
              <span className="font-semibold text-gray-900">{row.count}</span>
            </div>
          ))}
          {!typeRows.length && <p className="text-sm text-gray-500">No task type data yet.</p>}
        </div>
      </section>
    </div>
  )
}
