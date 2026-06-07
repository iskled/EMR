import api from '../api/axios'

export const getClinicalNotes =
  (patientId) =>
    api.get(
      `/clinical-notes/?patient=${patientId}`
    )

export const createClinicalNote = (data) =>
  api.post('/clinical-notes/', data)

export const getTreatmentPlans = (patientId) =>
  api.get(`/treatment-plans/?patient=${patientId}`)

export const getToothChart = (patientId) =>
  api.get(`/tooth-charts/${patientId}/`)

export const getClinicalImages = (patientId) =>
  api.get(`/clinical-images/?patient=${patientId}`)