import api from '../api/axios'

export async function searchPatients(q) {
  const response = await api.get('/patients/search/', { params: { q } })
  return response.data?.results || []
}

/**
 * Get Patients
 */
export async function getPatients({
  search = '',
  page = 1,
  ordering = '-created_at',
  is_active,
} = {}) {

  try {

    const response = await api.get('/patients/', {
      params: {
        search,
        page,
        ordering,
        ...(is_active === '' || is_active === undefined ? {} : { is_active }),
      },
    })

    return response.data

  } catch (error) {

    console.error(
      'Failed to fetch patients:',
      error
    )

    throw error
  }
}

export const getPatientSummary = async id => (await api.get(`/patients/${id}/summary/`)).data
export const archivePatient = (id, reason) => api.post(`/patients/${id}/archive/`, { reason })
export const reactivatePatient = id => api.post(`/patients/${id}/reactivate/`)
export const getPatientDocuments = async params => (await api.get('/patient-documents/', { params })).data
export const uploadPatientDocument = async payload => { const form=new FormData(); Object.entries(payload).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')form.append(k,v)}); return (await api.post('/patient-documents/',form)).data }
export const archivePatientDocument = id => api.post(`/patient-documents/${id}/archive/`)
export const fetchPatientDocument = (id, disposition='preview') => api.get(`/patient-documents/${id}/${disposition}/`, { responseType:'blob' })
export const getPatientCommunications = async params => (await api.get('/patient-communications/', { params })).data
export const createPatientCommunication = async data => (await api.post('/patient-communications/', data)).data
export const getMedicalHistory = async patient => (await api.get('/patient-medical-history/', { params:{patient} })).data
export const saveMedicalHistory = (id, data) => id ? api.patch(`/patient-medical-history/${id}/`, data) : api.post('/patient-medical-history/', data)
export const getAllergies = async patient => (await api.get('/patient-allergies/', { params:{patient} })).data

/**
 * Get Single Patient
 */
export async function getPatient(id) {

  try {

    const response = await api.get(
      `/patients/${id}/`
    )

    return response.data

  } catch (error) {

    console.error(
      'Failed to fetch patient:',
      error
    )

    throw error
  }
}

/**
 * Create Patient
 */
export async function createPatient(data) {

  try {

    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== '' && value !== null && value !== undefined)
    )

    const response = await api.post(
      '/patients/',
      payload
    )

    return response.data

  } catch (error) {

    console.error(
      'Failed to create patient:',
      error
    )

    throw error
  }
}

/**
 * Update Patient
 */
export async function updatePatient(
  id,
  data
) {

  try {

    const response = await api.patch(
      `/patients/${id}/`,
      data
    )

    return response.data

  } catch (error) {

    console.error(
      'Failed to update patient:',
      error
    )

    throw error
  }
}

/**
 * Archive/Delete Patient
 */
export async function deletePatient(id) {

  try {

    const response = await api.delete(
      `/patients/${id}/`
    )

    return response.data

  } catch (error) {

    console.error(
      'Failed to delete patient:',
      error
    )

    throw error
  }
}
