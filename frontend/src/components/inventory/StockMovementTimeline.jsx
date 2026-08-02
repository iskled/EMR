export default function StockMovementTimeline({ movements = [], compact = false }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="font-semibold">Stock Movement History</h3>
      <div className="mt-4 space-y-3">
        {movements.map(movement => (
          <div key={movement.id} className="rounded border border-gray-200 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">{movement.item_name} · {movement.movement_type}</p>
              <p className="text-gray-500">{new Date(movement.created_at).toLocaleString()}</p>
            </div>
            <p className="text-gray-600">
              {movement.quantity} from {movement.balance_before} to {movement.balance_after}
              {movement.batch_number ? ` · Batch ${movement.batch_number}` : ''}
            </p>
            {!compact && movement.notes && <p className="mt-1 text-gray-500">{movement.notes}</p>}
          </div>
        ))}
        {!movements.length && <p className="text-sm text-gray-500">No stock movements recorded.</p>}
      </div>
    </div>
  )
}
