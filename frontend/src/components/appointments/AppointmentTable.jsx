import AppointmentStatusBadge from './AppointmentStatusBadge'

export default function AppointmentTable({
  appointments = [],
  loading = false,
  onEdit,
  onCancel,
  onOpenClinical,
  onBilling,
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center">
        Loading appointments...
      </div>
    )
  }

  if (!appointments.length) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
        No appointments found.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-3 text-left">
              Time
            </th>
            <th className="px-4 py-3 text-left">
              Patient
            </th>
            <th className="px-4 py-3 text-left">
              Dentist
            </th>
            <th className="px-4 py-3 text-left">
              Procedure
            </th>
            <th className="px-4 py-3 text-left">
              Status
            </th>
            <th className="px-4 py-3 text-center">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {appointments.map(appointment => (
            <tr
              key={appointment.id}
              className="border-t hover:bg-blue-50 transition"
            >
              <td className="px-4 py-3 whitespace-nowrap">
                {appointment.start_time}
              </td>
              <td className="px-4 py-3">
                {appointment.patient_name}
              </td>
              <td className="px-4 py-3">
                {appointment.dentist_name}
              </td>
              <td className="px-4 py-3">
                {appointment.type_name}
              </td>
              <td className="px-4 py-3">
                <AppointmentStatusBadge status={appointment.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => onEdit?.(appointment)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => onOpenClinical?.(appointment)}
                    className="text-green-600 hover:underline"
                  >
                    Clinical
                  </button>

                  <button
                    onClick={() => onBilling?.(appointment)}
                    className="text-purple-600 hover:underline"
                  >
                    Billing
                  </button>

                  <button
                    onClick={() => onCancel?.(appointment)}
                    className="text-red-600 hover:underline"
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
