import api from '../api/axios'

function unwrapList(data) {
  if (Array.isArray(data)) return data
  return data?.results || []
}

export async function getAuditEvents(params = {}) {
  const response = await api.get('/audit-events/', { params })
  return response.data
}

export async function getAuditMetrics(params = {}) {
  const response = await api.get('/audit-events/metrics/', { params })
  return response.data
}

export async function exportAuditEvents(params = {}) {
  const response = await api.get('/audit-events/export/', { params, responseType: 'blob' })
  return response.data
}

export async function getLoginAttempts(params = {}) {
  const response = await api.get('/login-attempts/', { params })
  return unwrapList(response.data)
}
