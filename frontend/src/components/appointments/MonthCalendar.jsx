import {
  addDays,
  appointmentStyle,
  DAY_NAMES,
  groupAppointmentsByDate,
  sortAppointments,
  startOfMonthGrid,
  toDateKey,
} from './calendarUtils'

export default function MonthCalendar({
  date,
  appointments = [],
  onAppointmentClick,
  onSlotClick,
}) {
  const grouped = groupAppointmentsByDate(appointments)
  const firstGridDay = startOfMonthGrid(date)
  const days = Array.from({ length: 42 }, (_, index) => addDays(firstGridDay, index))
  const activeMonth = date.getMonth()
  const todayKey = toDateKey(new Date())

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {DAY_NAMES.map(day => (
          <div key={day} className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map(day => {
          const dateKey = toDateKey(day)
          const dayAppointments = sortAppointments(grouped[dateKey] || [])
          const outsideMonth = day.getMonth() !== activeMonth

          return (
            <div
              key={dateKey}
              className={`min-h-[142px] border-b border-r border-gray-200 p-2 ${
                outsideMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => onSlotClick?.({ date: dateKey, time: '08:00' })}
                className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold hover:bg-blue-50 ${
                  todayKey === dateKey ? 'bg-blue-600 text-white hover:bg-blue-600' : ''
                }`}
              >
                {day.getDate()}
              </button>

              <div className="space-y-1">
                {dayAppointments.slice(0, 4).map(appointment => (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() => onAppointmentClick?.(appointment)}
                    style={appointmentStyle(appointment)}
                    className="w-full rounded border border-gray-200 border-l-4 bg-white px-2 py-1 text-left text-[11px] shadow-sm hover:border-blue-300"
                  >
                    <span className="font-semibold">{appointment.start_time}</span>{' '}
                    <span className="truncate">{appointment.patient_name}</span>
                  </button>
                ))}
                {dayAppointments.length > 4 && (
                  <p className="text-[11px] font-semibold text-gray-500">
                    +{dayAppointments.length - 4} more
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
