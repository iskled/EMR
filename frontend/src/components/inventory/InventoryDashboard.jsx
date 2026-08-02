import InventoryMetrics from './InventoryMetrics'
import StockMovementTimeline from './StockMovementTimeline'

export default function InventoryDashboard({ dashboard, loading }) {
  return (
    <div className="space-y-4">
      <InventoryMetrics dashboard={dashboard} loading={loading} />
      <StockMovementTimeline movements={dashboard?.recent_movements || []} compact />
    </div>
  )
}
