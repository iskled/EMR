export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function addMonths(date, months) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

export function startOfWeek(date) {
  return addDays(date, -date.getDay())
}

export function startOfMonthGrid(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  return startOfWeek(first)
}

export function endOfMonthGrid(date) {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return addDays(last, 6 - last.getDay())
}

export function formatLongDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatMonthYear(date) {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function groupAppointmentsByDate(appointments = []) {
  return appointments.reduce((acc, appointment) => {
    if (!appointment.scheduled_date) return acc
    acc[appointment.scheduled_date] = acc[appointment.scheduled_date] || []
    acc[appointment.scheduled_date].push(appointment)
    return acc
  }, {})
}

export function sortAppointments(items = []) {
  return [...items].sort((a, b) => `${a.scheduled_date} ${a.start_time}`.localeCompare(`${b.scheduled_date} ${b.start_time}`))
}

export function statusDotClass(status) {
  const classes = {
    scheduled: 'bg-blue-500',
    confirmed: 'bg-emerald-500',
    in_progress: 'bg-violet-500',
    completed: 'bg-slate-500',
    cancelled: 'bg-rose-500',
    no_show: 'bg-amber-500',
  }
  return classes[status] || 'bg-gray-400'
}

export function appointmentStyle(appointment) {
  return {
    borderLeftColor: appointment.type_color || '#3B82F6',
  }
}
