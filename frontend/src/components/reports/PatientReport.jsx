import MetricCard from './MetricCard'
import SimpleBarList from './SimpleBarList'

export default function PatientReport({ data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard label="New Patients" value={data?.new_patients || 0} />
        <MetricCard label="Active" value={data?.active_patients || 0} />
        <MetricCard label="Inactive" value={data?.inactive_patients || 0} />
        <MetricCard label="Recall Due" value={data?.recall_due || 0} />
        <MetricCard label="Recall Overdue" value={data?.recall_overdue || 0} />
        <MetricCard label="No Future Appointment" value={data?.patients_without_future_appointment || 0} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SimpleBarList title="Age Groups" rows={data?.age_groups || []} labelKey="group" />
        <SimpleBarList title="Referral Sources" rows={data?.referral_sources || []} labelKey="referral_source" />
      </div>
    </div>
  )
}
