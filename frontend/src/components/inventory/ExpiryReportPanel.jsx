export default function ExpiryReportPanel({ batches = [] }) {
  const today = new Date()
  const soon = batches.filter(batch => batch.expiry_date && new Date(batch.expiry_date) <= new Date(today.getTime() + 30 * 86400000))
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="font-semibold">Expiry Report</h3>
      <div className="mt-3 space-y-2">
        {soon.map(batch => (
          <div key={batch.id} className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {batch.item_name} batch {batch.batch_number} expires {batch.expiry_date}
          </div>
        ))}
        {!soon.length && <p className="text-sm text-gray-500">No batches expiring in the next 30 days.</p>}
      </div>
    </div>
  )
}
