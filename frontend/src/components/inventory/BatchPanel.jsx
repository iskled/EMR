export default function BatchPanel({ batches = [] }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="font-semibold">Batch and Expiry Tracking</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-gray-500"><tr><th className="py-2 text-left">Item</th><th className="px-3 py-2 text-left">Batch</th><th className="px-3 py-2 text-left">Remaining</th><th className="px-3 py-2 text-left">Expiry</th><th className="px-3 py-2 text-left">Location</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
          <tbody className="divide-y">
            {batches.map(batch => <tr key={batch.id}><td className="py-2">{batch.item_name}</td><td className="px-3 py-2">{batch.batch_number}</td><td className="px-3 py-2">{batch.quantity_remaining}</td><td className="px-3 py-2">{batch.expiry_date || '-'}</td><td className="px-3 py-2">{batch.location_name || '-'}</td><td className="px-3 py-2">{batch.status}</td></tr>)}
          </tbody>
        </table>
        {!batches.length && <p className="py-6 text-center text-sm text-gray-500">No batches recorded.</p>}
      </div>
    </div>
  )
}
