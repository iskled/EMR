import api from '../api/axios'

const unwrap = data => Array.isArray(data) ? data : data?.results || []
export const getDentistAccounts = async params => unwrap((await api.get('/auth/dentist-accounts/', { params })).data)
export const createDentistAccount = async payload => (await api.post('/auth/dentist-accounts/', payload)).data
export const updateDentistAccount = async (id, payload) => (await api.patch(`/auth/dentist-accounts/${id}/`, payload)).data
export const getDentistDependencies = async id => (await api.get(`/auth/dentist-accounts/${id}/dependencies/`)).data
export const deactivateDentist = async (id, reason) => (await api.post(`/auth/dentist-accounts/${id}/deactivate/`, { reason })).data
export const reactivateDentist = async (id, reason = '') => (await api.post(`/auth/dentist-accounts/${id}/reactivate/`, { reason })).data
export const archiveDentist = async (id, reason) => (await api.post(`/auth/dentist-accounts/${id}/archive/`, { reason })).data
export const resetDentistPassword = async (id, temporary_password) => (await api.post(`/auth/dentist-accounts/${id}/reset-password/`, { temporary_password, force_password_change: true })).data
