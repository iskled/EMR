import api, { API_BASE_URL } from '../api/axios'

export const REPORT_TYPES = [
  { value: 'executive', label: 'Executive Dashboard' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'patients', label: 'Patients' },
  { value: 'clinical', label: 'Clinical' },
  { value: 'orthodontics', label: 'Orthodontics' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'staff', label: 'Staff Productivity' },
]

function unwrapList(data) {
  if (Array.isArray(data)) return data
  return data?.results || []
}

export const getReport = async (reportType, params = {}) => {
  const response = await api.get(`/reports/${reportType}/`, { params })
  return response.data
}

export const getSavedReports = async () => {
  const response = await api.get('/saved-reports/')
  return unwrapList(response.data)
}

export const saveReport = async payload => {
  const response = await api.post('/saved-reports/', payload)
  return response.data
}

export const runSavedReport = async id => {
  const response = await api.get(`/saved-reports/${id}/run/`)
  return response.data
}

export function reportExportUrl(reportType, format, params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) search.append(key, value)
  })
  return `${API_BASE_URL}/reports/${reportType}/export/${format}/?${search.toString()}`
}
