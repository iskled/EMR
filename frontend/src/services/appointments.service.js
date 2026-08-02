import api from '../api/axios'

export const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
]

export function unwrapList(data) {
  if (Array.isArray(data)) return data
  return data?.results || []
}

export const getDailyAppointments = async (params = {}) => {
  const response = await api.get('/appointments/daily/', { params })
  return response.data
}

export const getAppointments = async (params = {}) => {
  const response = await api.get('/appointments/', { params })
  return unwrapList(response.data)
}

export const getAppointment = async id => {
  const response = await api.get(`/appointments/${id}/`)
  return response.data
}

export const getCalendarAppointments = async (params = {}) => {
  const response = await api.get('/appointments/calendar/', { params })
  return response.data
}

export const createAppointment = async data => {
  const response = await api.post('/appointments/', data)
  return response.data
}

export const updateAppointment = async (id, data) => {
  const response = await api.patch(`/appointments/${id}/`, data)
  return response.data
}

export const updateAppointmentStatus = async (id, status, payload = {}) => {
  const response = await api.patch(`/appointments/${id}/status/`, {
    status,
    ...payload,
  })
  return response.data
}

export const getReminders = async params => (await api.get('/recalls/', { params })).data
export const updateReminder = async (id, payload) => (await api.patch(`/recalls/${id}/`, payload)).data
export const transitionReminder = async (id, payload) => (await api.post(`/recalls/${id}/transition/`, payload)).data
export const completeReminder = async (id, payload = {}) => (await api.post(`/recalls/${id}/complete/`, payload)).data
export const archiveReminder = async (id, reason = '') => (await api.post(`/recalls/${id}/archive/`, { reason })).data
export const restoreReminder = async id => (await api.post(`/recalls/${id}/restore/`)).data
export const contactReminder = async (id, payload) => (await api.post(`/recalls/${id}/contact/`, payload)).data
export const rescheduleReminder = async (id, payload) => (await api.post(`/recalls/${id}/reschedule/`, payload)).data
export const cancelReminder = async (id, reason) => (await api.post(`/recalls/${id}/cancel/`, { reason })).data
export const cancelReminderBooking = async (id, reason) => (await api.post(`/recalls/${id}/cancel-booking/`, { reason })).data
export const restoreCancelledReminder = async id => (await api.post(`/recalls/${id}/restore-cancelled/`)).data
export const permanentlyDeleteReminder = async id => (await api.delete(`/recalls/${id}/`, { data: { confirmation: 'DELETE' } })).data

export const cancelAppointment = (id, cancellationReason) =>
  updateAppointmentStatus(id, 'cancelled', {
    cancellation_reason: cancellationReason,
  })

export const getAppointmentTypes = async (params = {}) => {
  const response = await api.get('/appointment-types/', { params })
  return unwrapList(response.data)
}

export const getAvailableSlots = async ({
  dentist,
  date,
  duration = 30,
} = {}) => {
  const response = await api.get('/appointments/available-slots/', {
    params: {
      dentist,
      date,
      duration,
    },
  })
  return response.data
}

export const getDentists = async () => {
  const response = await api.get('/auth/dentists/')
  return unwrapList(response.data)
}

export const getWaitingList = async (params = {}) => {
  const response = await api.get('/waiting-list/', { params })
  return unwrapList(response.data)
}

export const scheduleWaitingListEntry = async (id, payload) => {
  const response = await api.post(`/waiting-list/${id}/schedule/`, payload)
  return response.data
}
