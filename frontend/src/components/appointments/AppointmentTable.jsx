import AppointmentStatusBadge from './AppointmentStatusBadge'

export default function AppointmentTable({
  appointments = [],
  loading = false,
  error = '',
  onOpen,
  onEdit,
  onCancel,
  onOpenClinical,
  onBilling,
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-500 shadow-sm">
        Loading appointments...
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg border border-red-200 p-6 text-red-800 shadow-sm">
        {error}
      </div>
    )
  }

  if (!appointments.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-500 shadow-sm">
        No appointments match the current filters.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Time</th>
            <th className="px-4 py-3 text-left">Patient</th>
            <th className="px-4 py-3 text-left">Dentist</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {appointments.map(appointment => (
            <tr key={appointment.id} className="hover:bg-blue-50/60">
              <td className="px-4 py-3 whitespace-nowrap">
                {appointment.scheduled_date}
              </td>
              <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                {appointment.start_time} - {appointment.end_time}
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onOpen?.(appointment)}
                  className="font-semibold text-blue-700 hover:underline"
                >
                  {appointment.patient_name}
                </button>
                <p className="text-xs text-gray-500">{appointment.patient_code}</p>
              </td>
              <td className="px-4 py-3">{appointment.dentist_name}</td>
              <td className="px-4 py-3">
                <span
                  className="inline-flex items-center gap-2"
                  title={appointment.type_name}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: appointment.type_color || '#3B82F6' }}
                  />
                  {appointment.type_name}
                </span>
              </td>
              <td className="px-4 py-3">
                <AppointmentStatusBadge status={appointment.status} compact />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen?.(appointment)}
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit?.(appointment)}
                    className="font-semibold text-gray-700 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenClinical?.(appointment)}
                    className="font-semibold text-emerald-700 hover:underline"
                  >
                    Clinical
                  </button>
                  <button
                    type="button"
                    onClick={() => onBilling?.(appointment)}
                    className="font-semibold text-violet-700 hover:underline"
                  >
                    Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => onCancel?.(appointment)}
                    className="font-semibold text-rose-700 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
