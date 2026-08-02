import MetricCard from './MetricCard'
import { formatCurrency } from '../../utils/currency'

export default function ReportsDashboard({ data }) {
  const metrics = data?.metrics || {}
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      <MetricCard label="Active Patients" value={metrics.total_active_patients} />
      <MetricCard label="New Patients" value={metrics.new_patients} />
      <MetricCard label="Appointments Today" value={metrics.appointments_today} />
      <MetricCard label="Completion Rate" value={`${metrics.completion_rate || 0}%`} />
      <MetricCard label="No-show Rate" value={`${metrics.no_show_rate || 0}%`} />
      <MetricCard label="Active Ortho Cases" value={metrics.active_orthodontic_cases} />
      <MetricCard label="Ortho Reviews Due" value={metrics.orthodontic_reviews_due} />
      <MetricCard label="Inventory Value" value={formatCurrency(metrics.inventory_value)} />
      <MetricCard label="Low Stock" value={metrics.low_stock_count} />
      <MetricCard label="Expiring Stock" value={metrics.expiring_stock_count} />
    </div>
  )
}
