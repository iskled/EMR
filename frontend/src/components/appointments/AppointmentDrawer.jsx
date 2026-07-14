import AppointmentStatusBadge from './AppointmentStatusBadge'

export default function AppointmentDrawer({
  appointment,
  open,
  onClose,
  onClinical,
  onBilling,
  onStatusChange,
}) {
  if (!open || !appointment) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 h-full w-[460px] bg-white shadow-2xl overflow-y-auto">
        <div className="flex justify-between items-center border-b p-5">
          <h2 className="text-xl font-semibold">
            Appointment Details
          </h2>

          <button
            onClick={onClose}
            className="text-gray-600 text-xl"
            aria-label="Close appointment details"
          >
            x
          </button>
        </div>

        <div className="space-y-6 p-6">
          <section>
            <h3 className="font-semibold mb-3">
              Patient
            </h3>

            <p className="text-lg">
              {appointment.patient_name}
            </p>

            <p className="text-gray-500">
              {appointment.patient_code}
            </p>
          </section>

          <section>
            <h3 className="font-semibold mb-3">
              Dentist
            </h3>

            <p>{appointment.dentist_name}</p>
          </section>

          <section>
            <h3 className="font-semibold mb-3">
              Procedure
            </h3>

            <p>{appointment.type_name}</p>
          </section>

          <section>
            <h3 className="font-semibold mb-3">
              Time
            </h3>

            <p>{appointment.scheduled_date}</p>
            <p>{appointment.start_time}</p>
          </section>

          <section>
            <h3 className="font-semibold mb-3">
              Status
            </h3>

            <AppointmentStatusBadge status={appointment.status} />
          </section>

          <section>
            <h3 className="font-semibold mb-3">
              Notes
            </h3>

            <div className="border rounded-lg p-3">
              {appointment.chief_complaint || 'No notes'}
            </div>
          </section>

          <section>
            <h3 className="font-semibold mb-3">
              Quick Actions
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                className="bg-blue-600 text-white rounded-lg py-2"
                onClick={() => onClinical?.(appointment)}
              >
                Open Clinical
              </button>

              <button
                className="bg-purple-600 text-white rounded-lg py-2"
                onClick={() => onBilling?.(appointment)}
              >
                Billing
              </button>

              <button
                className="bg-green-600 text-white rounded-lg py-2"
                onClick={() => onStatusChange?.(appointment, 'confirmed')}
              >
                Confirm
              </button>

              <button
                className="bg-orange-600 text-white rounded-lg py-2"
                onClick={() => onStatusChange?.(appointment, 'in_progress')}
              >
                Start
              </button>

              <button
                className="bg-gray-700 text-white rounded-lg py-2"
                onClick={() => onStatusChange?.(appointment, 'completed')}
              >
                Complete
              </button>

              <button
                className="bg-red-600 text-white rounded-lg py-2"
                onClick={() => onStatusChange?.(appointment, 'cancelled')}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
