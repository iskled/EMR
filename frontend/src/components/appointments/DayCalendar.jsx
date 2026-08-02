import AppointmentStatusBadge from './AppointmentStatusBadge'
import { appointmentStyle, sortAppointments, statusDotClass, toDateKey } from './calendarUtils'

const HOURS = Array.from({ length: 11 }, (_, index) => 8 + index)

export default function DayCalendar({
  date,
  appointments = [],
  onAppointmentClick,
  onSlotClick,
}) {
  const dateKey = toDateKey(date)
  const dayAppointments = sortAppointments(
    appointments.filter(item => item.scheduled_date === dateKey)
  )

  function appointmentsForHour(hour) {
    const prefix = String(hour).padStart(2, '0')
    return dayAppointments.filter(item => item.start_time?.startsWith(prefix))
  }

  return (
    <div className="divide-y divide-gray-200">
      {HOURS.map(hour => {
        const time = `${String(hour).padStart(2, '0')}:00`
        const hourAppointments = appointmentsForHour(hour)

        return (
          <div key={time} className="grid grid-cols-[90px_1fr] min-h-[92px]">
            <button
              type="button"
              onClick={() => onSlotClick?.({ date: dateKey, time })}
              className="border-r border-gray-200 bg-gray-50 px-3 py-4 text-left text-sm font-semibold text-gray-600 hover:bg-blue-50"
            >
              {time}
            </button>
            <div className="space-y-2 p-3">
              {hourAppointments.map(appointment => (
                <button
                  key={appointment.id}
                  type="button"
                  onClick={() => onAppointmentClick?.(appointment)}
                  style={appointmentStyle(appointment)}
                  className="w-full rounded-lg border border-gray-200 border-l-4 bg-white p-3 text-left shadow-sm hover:border-blue-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {appointment.start_time} - {appointment.end_time} · {appointment.patient_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {appointment.type_name} · {appointment.dentist_name}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={appointment.status} compact />
                  </div>
                </button>
              ))}
              {!hourAppointments.length && (
                <button
                  type="button"
                  onClick={() => onSlotClick?.({ date: dateKey, time })}
                  className="h-12 w-full rounded-lg border border-dashed border-gray-200 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-700"
                >
                  Open slot
                </button>
              )}
            </div>
          </div>
        )
      })}

      {!!dayAppointments.length && (
        <div className="flex flex-wrap gap-3 p-4 text-xs text-gray-500">
          {dayAppointments.map(appointment => (
            <span key={`legend-${appointment.id}`} className="inline-flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${statusDotClass(appointment.status)}`} />
              {appointment.patient_name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
