import api from '../api/axios'

export const getDailyAppointments = () =>
  api.get('/appointments/daily/')

export const getAppointments = (params = {}) =>
  api.get('/appointments/', { params })

export const createAppointment = data =>
  api.post('/appointments/', data)

export const updateAppointment = (id, data) =>
  api.patch(`/appointments/${id}/`, data)

export const updateAppointmentStatus = (id, status, payload = {}) =>
  api.patch(`/appointments/${id}/status/`, {
    status,
    ...payload,
  })

export const cancelAppointment = id =>
  updateAppointmentStatus(id, 'cancelled', {
    cancellation_reason: 'Cancelled from appointment workspace',
  })

export const getAppointmentTypes = () =>
  api.get('/appointment-types/')

export const getAvailableSlots = (dentist, date, duration) =>
  api.get('/appointments/available-slots/', {
    params: {
      dentist,
      date,
      duration,
    },
  })

export const getDentists = () =>
  api.get('/auth/dentists/')
