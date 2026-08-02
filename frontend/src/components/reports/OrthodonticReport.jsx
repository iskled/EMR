import MetricCard from './MetricCard'
import SimpleBarList from './SimpleBarList'

export default function OrthodonticReport({ data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard label="Active Cases" value={data?.active_cases || 0} />
        <MetricCard label="Completed Cases" value={data?.completed_cases || 0} />
        <MetricCard label="Retention Cases" value={data?.retention_cases || 0} />
        <MetricCard label="Reviews Due" value={data?.reviews_due || 0} />
        <MetricCard label="Avg Duration" value={`${Number(data?.average_treatment_duration || 0).toFixed(1)} mo`} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SimpleBarList title="Cases by Stage" rows={data?.cases_by_stage || []} labelKey="stage" />
        <SimpleBarList title="Visits per Case" rows={data?.visits_per_case || []} labelKey={row => `${row.ortho_case__patient__first_name || ''} ${row.ortho_case__patient__last_name || ''}`.trim()} />
      </div>
    </div>
  )
}
