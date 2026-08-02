import MetricCard from './MetricCard'
import SimpleBarList from './SimpleBarList'
import { formatCurrency } from '../../utils/currency'

export default function InventoryReport({ data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard label="Stock Valuation" value={formatCurrency(data?.stock_valuation)} />
        <MetricCard label="Low Stock" value={data?.low_stock || 0} />
        <MetricCard label="Out of Stock" value={data?.out_of_stock || 0} />
        <MetricCard label="Expiring Soon" value={data?.expiring_soon || 0} />
        <MetricCard label="Expired" value={data?.expired || 0} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SimpleBarList title="Current Stock" rows={data?.current_stock || []} labelKey={row => `${row.sku} ${row.name}`} valueKey="stock" />
        <SimpleBarList title="Usage by Item" rows={data?.usage_by_item || []} labelKey={row => `${row.item__sku} ${row.item__name}`} valueKey="quantity" />
        <SimpleBarList title="Usage by Clinician" rows={data?.usage_by_clinician || []} labelKey={row => `${row.user__first_name || ''} ${row.user__last_name || row.user__role || ''}`.trim()} valueKey="quantity" />
        <SimpleBarList title="Supplier Purchase History" rows={data?.supplier_purchase_history || []} labelKey={row => `${row.supplier__name} / ${row.status}`} />
      </div>
    </div>
  )
}
