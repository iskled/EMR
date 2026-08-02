import api from '../api/axios'

export const CASE_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'retention', label: 'Retention' },
  { value: 'completed', label: 'Completed' },
  { value: 'paused', label: 'Paused' },
  { value: 'archived', label: 'Archived' },
]

export const VISIT_TYPE_OPTIONS = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'records', label: 'Records' },
  { value: 'bonding', label: 'Bonding' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'wire_change', label: 'Wire Change' },
  { value: 'elastic_review', label: 'Elastic Review' },
  { value: 'repair', label: 'Repair' },
  { value: 'debond', label: 'Debond' },
  { value: 'retention', label: 'Retention' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
]

export const MEASUREMENT_FIELDS = [
  'overjet',
  'overbite',
  'crowding',
  'spacing',
  'midline',
  'crossbite',
  'open_bite',
  'deep_bite',
  'molar_relationship',
  'canine_relationship',
  'additional_measurements',
]

export const APPLIANCE_FIELDS = [
  'upper_appliance',
  'lower_appliance',
  'bracket_system',
  'archwire_sequence',
  'elastic_prescription',
  'attachments',
  'retainers',
  'repairs',
  'replacement_history',
  'clinical_notes',
]

function unwrapList(data) {
  if (Array.isArray(data)) return data
  return data?.results || []
}

export const getOrthodonticCases = async (params = {}) => {
  const response = await api.get('/orthodontic-cases/', { params })
  return unwrapList(response.data)
}

export const getOrthodonticCase = async id => {
  const response = await api.get(`/orthodontic-cases/${id}/`)
  return response.data
}

export const createOrthodonticCase = async payload => {
  const response = await api.post('/orthodontic-cases/', payload)
  return response.data
}

export const updateOrthodonticCase = async (id, payload) => {
  const response = await api.patch(`/orthodontic-cases/${id}/`, payload)
  return response.data
}

export const archiveOrthodonticCase = async id => {
  const response = await api.post(`/orthodontic-cases/${id}/archive/`)
  return response.data
}

export const getOrthodonticTimeline = async id => {
  const response = await api.get(`/orthodontic-cases/${id}/timeline/`)
  return response.data
}

export const getOrthodonticProgress = async id => {
  const response = await api.get(`/orthodontic-cases/${id}/progress/`)
  return response.data
}

export const getOrthodonticVisits = async (params = {}) => {
  const response = await api.get('/orthodontic-visits/', { params })
  return unwrapList(response.data)
}

export const createOrthodonticVisit = async payload => {
  const response = await api.post('/orthodontic-visits/', payload)
  return response.data
}

export const updateOrthodonticVisit = async (id, payload) => {
  const response = await api.patch(`/orthodontic-visits/${id}/`, payload)
  return response.data
}

export const uploadOrthodonticPhoto = async payload => {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, value)
    }
  })
  const response = await api.post('/orthodontic-photos/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const deleteOrthodonticPhoto = id =>
  api.delete(`/orthodontic-photos/${id}/`)

export const uploadOrthodonticDocument = async payload => {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, value)
    }
  })
  const response = await api.post('/orthodontic-documents/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const deleteOrthodonticDocument = id =>
  api.delete(`/orthodontic-documents/${id}/`)

export function formatLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

export function parseJsonField(value, fallback) {
  if (typeof value !== 'string') return value || fallback
  if (!value.trim()) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}
