import DayCalendar from './DayCalendar'
import WeekCalendar from './WeekCalendar'
import MonthCalendar from './MonthCalendar'
import {
  addDays,
  addMonths,
  formatLongDate,
  formatMonthYear,
  startOfWeek,
} from './calendarUtils'

const viewOptions = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

export default function AppointmentCalendar({
  appointments = [],
  selectedDate,
  view,
  onViewChange,
  onDateChange,
  onAppointmentClick,
  onSlotClick,
}) {
  const date = selectedDate || new Date()

  function move(direction) {
    if (view === 'day') {
      onDateChange?.(addDays(date, direction))
      return
    }

    if (view === 'week') {
      onDateChange?.(addDays(date, direction * 7))
      return
    }

    onDateChange?.(addMonths(date, direction))
  }

  function title() {
    if (view === 'day') return formatLongDate(date)
    if (view === 'week') {
      const start = startOfWeek(date)
      const end = addDays(start, 6)
      return `${formatLongDate(start)} - ${formatLongDate(end)}`
    }
    return formatMonthYear(date)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title()}</h2>
          <p className="text-sm text-gray-500">
            {appointments.length} appointment{appointments.length === 1 ? '' : 's'} in view
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            {viewOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => onViewChange?.(option.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  view === option.value
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => move(-1)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onDateChange?.(new Date())}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>

      {view === 'day' && (
        <DayCalendar
          date={date}
          appointments={appointments}
          onAppointmentClick={onAppointmentClick}
          onSlotClick={onSlotClick}
        />
      )}
      {view === 'week' && (
        <WeekCalendar
          date={date}
          appointments={appointments}
          onAppointmentClick={onAppointmentClick}
          onSlotClick={onSlotClick}
        />
      )}
      {view === 'month' && (
        <MonthCalendar
          date={date}
          appointments={appointments}
          onAppointmentClick={onAppointmentClick}
          onSlotClick={onSlotClick}
        />
      )}
    </div>
  )
}
