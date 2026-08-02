import api from '../api/axios'

function unwrapList(data) {
  if (Array.isArray(data)) return data
  return data?.results || []
}

export async function getSecurityDashboard() {
  const response = await api.get('/security/dashboard/')
  return response.data
}

export async function getSecurityAlerts(params = {}) {
  const response = await api.get('/security-alerts/', { params })
  return unwrapList(response.data)
}

export async function acknowledgeSecurityAlert(id) {
  const response = await api.post(`/security-alerts/${id}/acknowledge/`)
  return response.data
}

export async function resolveSecurityAlert(id) {
  const response = await api.post(`/security-alerts/${id}/resolve/`)
  return response.data
}

export async function getPermissionMatrix() {
  const response = await api.get('/security/permission-matrix/')
  return response.data.permissions
}
