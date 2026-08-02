import SimpleBarList from './SimpleBarList'

export default function StaffProductivityReport({ data }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <SimpleBarList title="Appointment Volume by Staff" rows={data?.appointment_volume || []} labelKey={row => `${row.dentist__first_name || ''} ${row.dentist__last_name || row.dentist__role || ''}`.trim()} />
      <SimpleBarList title="Clinical Activity" rows={data?.clinical_activity || []} labelKey={row => `${row.dentist__first_name || ''} ${row.dentist__last_name || ''}`.trim()} />
      <SimpleBarList title="Orthodontic Visits" rows={data?.orthodontic_visits || []} labelKey={row => `${row.dentist__first_name || ''} ${row.dentist__last_name || ''}`.trim()} />
      <SimpleBarList title="Inventory Activity" rows={data?.inventory_activity || []} labelKey={row => `${row.user__first_name || ''} ${row.user__last_name || row.user__role || ''}`.trim()} />
    </div>
  )
}
