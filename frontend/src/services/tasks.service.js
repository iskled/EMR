import api from '../api/axios'

function unwrapList(data) {
  if (Array.isArray(data)) return data
  return data?.results || []
}

export const TASK_TYPES = [
  { value: 'administrative', label: 'Administrative' },
  { value: 'clinical', label: 'Clinical' },
  { value: 'orthodontic', label: 'Orthodontic' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'patient_follow_up', label: 'Patient Follow-up' },
  { value: 'recall', label: 'Recall' },
  { value: 'document', label: 'Document' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'other', label: 'Other' },
]

export const TASK_STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'awaiting_review', label: 'Awaiting Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export const STAFF_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'dentist', label: 'Dentist' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'receptionist', label: 'Receptionist' },
]

export async function getTasks(params = {}) {
  const response = await api.get('/tasks/', { params })
  return response.data
}

export async function getTaskMetrics() {
  const response = await api.get('/tasks/metrics/')
  return response.data
}

export async function getTaskStaff() {
  const response = await api.get('/tasks/staff/')
  return response.data
}

export async function createTask(payload) {
  const response = await api.post('/tasks/', payload)
  return response.data
}

export async function updateTask(id, payload) {
  const response = await api.patch(`/tasks/${id}/`, payload)
  return response.data
}

export async function completeTask(id) {
  const response = await api.post(`/tasks/${id}/complete/`)
  return response.data
}

export async function claimTask(id) {
  const response = await api.post(`/tasks/${id}/claim/`)
  return response.data
}

export async function reassignTask(id, payload) {
  const response = await api.post(`/tasks/${id}/reassign/`, payload)
  return response.data
}

export async function applyChecklistTemplate(id, template) {
  const response = await api.post(`/tasks/${id}/apply-template/`, { template })
  return response.data
}

export async function getChecklistTemplates(params = {}) {
  const response = await api.get('/task-checklist-templates/', { params })
  return unwrapList(response.data)
}

export async function createChecklistTemplate(payload) {
  const response = await api.post('/task-checklist-templates/', payload)
  return response.data
}

export async function updateChecklistItem(id, payload) {
  const response = await api.patch(`/task-checklist-items/${id}/`, payload)
  return response.data
}

export async function completeChecklistItem(id) {
  const response = await api.post(`/task-checklist-items/${id}/complete/`)
  return response.data
}

export async function addTaskComment(payload) {
  const response = await api.post('/task-comments/', payload)
  return response.data
}

export async function createTaskDependency(payload) {
  const response = await api.post('/task-dependencies/', payload)
  return response.data
}

export async function deleteTaskDependency(id) {
  await api.delete(`/task-dependencies/${id}/`)
}

export async function getTaskAlerts(params = {}) {
  const response = await api.get('/task-alerts/', { params })
  return unwrapList(response.data)
}

export async function updateTaskAlert(id, action) {
  const response = await api.post(`/task-alerts/${id}/${action}/`)
  return response.data
}
