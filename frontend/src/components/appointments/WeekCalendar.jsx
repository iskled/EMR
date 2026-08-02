import {
  addDays,
  appointmentStyle,
  DAY_NAMES,
  sortAppointments,
  startOfWeek,
  toDateKey,
} from './calendarUtils'

export default function WeekCalendar({
  date,
  appointments = [],
  onAppointmentClick,
  onSlotClick,
}) {
  const start = startOfWeek(date)
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-7 divide-y lg:divide-x lg:divide-y-0 divide-gray-200">
      {days.map(day => {
        const dateKey = toDateKey(day)
        const dayAppointments = sortAppointments(
          appointments.filter(item => item.scheduled_date === dateKey)
        )

        return (
          <div key={dateKey} className="min-h-[260px] bg-white">
            <button
              type="button"
              onClick={() => onSlotClick?.({ date: dateKey, time: '08:00' })}
              className="w-full border-b border-gray-200 bg-gray-50 px-3 py-3 text-left hover:bg-blue-50"
            >
              <p className="text-xs font-semibold uppercase text-gray-500">
                {DAY_NAMES[day.getDay()]}
              </p>
              <p className="text-lg font-bold text-gray-900">{day.getDate()}</p>
            </button>

            <div className="space-y-2 p-2">
              {dayAppointments.map(appointment => (
                <button
                  key={appointment.id}
                  type="button"
                  onClick={() => onAppointmentClick?.(appointment)}
                  style={appointmentStyle(appointment)}
                  className="w-full rounded-md border border-gray-200 border-l-4 bg-white px-2 py-2 text-left text-xs shadow-sm hover:border-blue-300"
                >
                  <p className="font-semibold text-gray-900">
                    {appointment.start_time} {appointment.patient_name}
                  </p>
                  <p className="truncate text-gray-500">{appointment.type_name}</p>
                  <p className="truncate text-gray-500">{appointment.status}</p>
                </button>
              ))}
              {!dayAppointments.length && (
                <button
                  type="button"
                  onClick={() => onSlotClick?.({ date: dateKey, time: '08:00' })}
                  className="w-full rounded-md border border-dashed border-gray-200 px-2 py-6 text-xs text-gray-400 hover:border-blue-300 hover:text-blue-700"
                >
                  No appointments
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
