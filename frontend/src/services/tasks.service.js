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
  { value: 'pending_acceptance', label: 'Pending Acceptance' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_for_vendor', label: 'Waiting for Vendor' },
  { value: 'waiting_for_staff', label: 'Waiting for Staff' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export const WORKABLE_TASK_STATUSES = TASK_STATUSES.map(({ value }) => value).filter(value => value !== 'pending_acceptance')

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

export async function getTaskNotifications() {
  const response = await api.get('/tasks/notifications/')
  return unwrapList(response.data)
}

export async function markTaskNotificationRead(id) {
  const response = await api.post(`/tasks/notifications/${id}/read/`)
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

export async function deleteTask(id, payload) {
  await api.delete(`/tasks/${id}/`, { data: payload })
}

export async function acceptTask(id) {
  const response = await api.post(`/tasks/${id}/accept/`)
  return response.data
}

export async function declineTask(id, reason = '') {
  const response = await api.post(`/tasks/${id}/decline/`, { reason })
  return response.data
}

export async function transitionTask(id, payload) {
  const response = await api.post(`/tasks/${id}/transition/`, payload)
  return response.data
}

export async function overrideTaskStage(id, payload) {
  const response = await api.post(`/tasks/${id}/admin-override/`, payload)
  return response.data
}

export async function startTaskWork(id, payload = {}) {
  const response = await api.post(`/tasks/${id}/start-work/`, payload)
  return response.data
}

export async function markTaskWaiting(id, payload) {
  const response = await api.post(`/tasks/${id}/mark-waiting/`, payload)
  return response.data
}

export async function markTaskBlocked(id, payload) {
  const response = await api.post(`/tasks/${id}/mark-blocked/`, payload)
  return response.data
}

export async function resumeTask(id, payload = {}) {
  const response = await api.post(`/tasks/${id}/resume/`, payload)
  return response.data
}

export async function addTaskProgressUpdate(id, payload) {
  const response = await api.post(`/tasks/${id}/progress-updates/`, payload)
  return response.data
}

export async function completeTask(id, payload = {}) {
  const response = await api.post(`/tasks/${id}/complete/`, payload)
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

export async function uploadTaskAttachment(payload) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') formData.append(key, value)
  })
  const response = await api.post('/task-attachments/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function archiveTaskAttachment(id, reason) {
  const response = await api.post(`/task-attachments/${id}/archive/`, { reason })
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
