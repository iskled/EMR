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

export const getClinicalTimeline = async patientId => {
  const response = await api.get('/clinical-notes/timeline/', {
    params: {
      patient: patientId,
    },
  })

  return response.data
}

export const getClinicalImages = patientId =>
  api.get('/clinical-images/', {
    params: {
      patient: patientId,
    },
  })

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
