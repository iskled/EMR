import api from '../api/axios'

export const USER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'dentist', label: 'Dentist' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'receptionist', label: 'Receptionist' },
]

function unwrapList(data) {
  if (Array.isArray(data)) return data
  return data?.results || []
}

export async function getUsers(params = {}) {
  const response = await api.get('/auth/users/', { params })
  return response.data
}

export async function getUserMetrics() {
  const response = await api.get('/auth/users/metrics/')
  return response.data
}

export async function createUser(payload) {
  const response = await api.post('/auth/users/', payload)
  return response.data
}

export async function updateUser(id, payload) {
  const response = await api.patch(`/auth/users/${id}/`, payload)
  return response.data
}

export async function activateUser(id) {
  const response = await api.post(`/auth/users/${id}/activate/`)
  return response.data
}

export async function deactivateUser(id) {
  const response = await api.post(`/auth/users/${id}/deactivate/`)
  return response.data
}

export async function unlockUser(id) {
  const response = await api.post(`/auth/users/${id}/unlock/`)
  return response.data
}

export async function resetFailedLogins(id) {
  const response = await api.post(`/auth/users/${id}/reset-failed-logins/`)
  return response.data
}

export async function forcePasswordChange(id) {
  const response = await api.post(`/auth/users/${id}/force-password-change/`)
  return response.data
}

export async function resetUserPassword(id, payload) {
  const response = await api.post(`/auth/users/${id}/reset-password/`, payload)
  return response.data
}

export async function revokeUserSessions(id) {
  const response = await api.post(`/auth/users/${id}/revoke-sessions/`)
  return response.data
}

export async function getUserSecurityHistory(id) {
  const response = await api.get(`/auth/users/${id}/security-history/`)
  return response.data
}

export async function getUserAuditHistory(id) {
  const response = await api.get(`/auth/users/${id}/audit-history/`)
  return response.data
}

export async function getUserPermissionMatrix() {
  const response = await api.get('/auth/users/permission-matrix/')
  return response.data.permissions
}

export { unwrapList }
