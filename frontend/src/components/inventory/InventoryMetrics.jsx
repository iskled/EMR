function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

export default function InventoryMetrics({ dashboard, loading }) {
  const money = formatCurrency(dashboard?.total_stock_value)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Metric label="Total Items" value={loading ? '...' : dashboard?.total_items || 0} />
      <Metric label="Total Stock Value" value={loading ? '...' : money} />
      <Metric label="Low Stock" value={loading ? '...' : dashboard?.low_stock_items || 0} />
      <Metric label="Out Of Stock" value={loading ? '...' : dashboard?.out_of_stock_items || 0} />
      <Metric label="Expiring Soon" value={loading ? '...' : dashboard?.expiring_soon || 0} />
      <Metric label="Expired" value={loading ? '...' : dashboard?.expired_items || 0} />
      <Metric label="Pending Purchase Orders" value={loading ? '...' : dashboard?.pending_purchase_orders || 0} />
      <Metric label="Recent Movements" value={loading ? '...' : dashboard?.recent_movements?.length || 0} />
    </div>
  )
}
import { formatCurrency } from '../../utils/currency'
