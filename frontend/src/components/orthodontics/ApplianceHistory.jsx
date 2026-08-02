export default function ApplianceHistory({ visits = [] }) {
  const changes = visits.filter(visit => visit.appliance_changes && Object.keys(visit.appliance_changes).length)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900">Appliance Replacement History</h3>
      <div className="mt-4 space-y-3">
        {changes.map(visit => (
          <div key={visit.id} className="rounded-lg border border-gray-200 p-3">
            <p className="font-semibold">{visit.visit_date}</p>
            <pre className="mt-2 whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-700">
              {JSON.stringify(visit.appliance_changes, null, 2)}
            </pre>
          </div>
        ))}
        {!changes.length && <p className="text-sm text-gray-500">No appliance changes recorded.</p>}
      </div>
    </div>
  )
}
