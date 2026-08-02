export default function TasksDashboard({ metrics }) {
  const statusRows = metrics?.by_status || []
  const typeRows = metrics?.by_type || []

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Status workload</h2>
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
        <h2 className="text-lg font-semibold text-gray-900">Workflow mix</h2>
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
