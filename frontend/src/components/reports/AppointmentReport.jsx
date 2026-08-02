import MetricCard from './MetricCard'
import SimpleBarList from './SimpleBarList'

export default function AppointmentReport({ data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="No-shows" value={data?.no_shows || 0} />
        <MetricCard label="Cancellations" value={data?.cancellations || 0} />
        <MetricCard label="Avg Duration" value={`${Number(data?.average_duration || 0).toFixed(1)} min`} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SimpleBarList title="Status Breakdown" rows={data?.status_breakdown || []} labelKey="status" />
        <SimpleBarList title="Dentist Workload" rows={data?.dentist_workload || []} labelKey={row => `${row.dentist__first_name || ''} ${row.dentist__last_name || row.dentist__email || ''}`.trim()} />
        <SimpleBarList title="Appointment Type Volume" rows={data?.appointment_type_volume || []} labelKey="appointment_type__name" />
        <SimpleBarList title="Monthly Volume" rows={data?.monthly_volume || []} labelKey={row => String(row.period).slice(0, 10)} />
      </div>
    </div>
  )
}
