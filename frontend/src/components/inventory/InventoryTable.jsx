import { formatCurrency } from '../../utils/currency'

export default function InventoryTable({
  items = [],
  loading,
  error,
  onEdit,
  onReceive,
  onUse,
  onAdjust,
  canEdit = false,
  canReceive = false,
  canUse = false,
  canAdjust = false,
}) {
  if (loading) return <div className="rounded-lg border bg-white p-10 text-center text-gray-500">Loading inventory...</div>
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
  if (!items.length) return <div className="rounded-lg border bg-white p-10 text-center text-gray-500">No inventory items found.</div>

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">Item</th>
            <th className="px-4 py-3 text-left">Category</th>
            <th className="px-4 py-3 text-left">Stock</th>
            <th className="px-4 py-3 text-left">Reorder</th>
            <th className="px-4 py-3 text-left">Value</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(item => (
            <tr key={item.id} className="hover:bg-blue-50/60">
              <td className="px-4 py-3">
                {canEdit ? (
                  <button type="button" onClick={() => onEdit?.(item)} className="font-semibold text-blue-700 hover:underline">{item.name}</button>
                ) : (
                  <span className="font-semibold text-gray-900">{item.name}</span>
                )}
                <p className="text-xs text-gray-500">{item.sku} - {item.unit_of_measure}</p>
              </td>
              <td className="px-4 py-3">{item.category_name || '-'}</td>
              <td className="px-4 py-3 font-semibold">{item.current_stock}</td>
              <td className="px-4 py-3">{item.reorder_level}</td>
              <td className="px-4 py-3">{formatCurrency(item.stock_value)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap justify-end gap-2">
                  {canReceive && <button className="font-semibold text-blue-700 hover:underline" onClick={() => onReceive?.(item)}>Receive</button>}
                  {canUse && <button className="font-semibold text-emerald-700 hover:underline" onClick={() => onUse?.(item)}>Use</button>}
                  {canAdjust && <button className="font-semibold text-amber-700 hover:underline" onClick={() => onAdjust?.(item)}>Adjust</button>}
                  {!canReceive && !canUse && !canAdjust && <span className="text-gray-500">View only</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
