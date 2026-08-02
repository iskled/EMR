import api from '../api/axios'

function unwrapList(data) {
  return Array.isArray(data) ? data : data.results || []
}

export const getClinicalNotes = patientId =>
  api.get('/clinical-notes/', {
    params: {
      patient: patientId,
    },
  })

export const createClinicalNote = data =>
  api.post('/clinical-notes/', data)

export const createRecall = data => api.post('/recalls/', data)

export const getClinicalTimeline = async patientId => {
  const response = await api.get('/clinical-notes/timeline/', {
    params: {
      patient: patientId,
    },
  })

  return Array.isArray(response.data) ? response.data : (response.data?.results || [])
}

export const getClinicalImages = patientId =>
  api.get('/clinical-images/', {
    params: {
      patient: patientId,
    },
  })

export const uploadClinicalImage = async payload => {
  const form = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') form.append(key, value)
  })
  const response = await api.post('/clinical-images/', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return response.data
}

export const deleteClinicalImage = id => api.delete(`/clinical-images/${id}/`)

export const getClinicalTemplates = async (params = {}) => {
  const response = await api.get('/clinical-templates/', {
    params,
  })

  return unwrapList(response.data)
}

export const getOrthodonticCases = async (params = {}) => {
  const response = await api.get('/orthodontic-cases/', {
    params,
  })

  return unwrapList(response.data)
}
