import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { hasPermission } from '../permissions/permissions'
import ChecklistTemplateManager from '../components/tasks/ChecklistTemplateManager'
import TaskAlerts from '../components/tasks/TaskAlerts'
import TaskBoard from '../components/tasks/TaskBoard'
import TaskDrawer from '../components/tasks/TaskDrawer'
import TaskFilters from '../components/tasks/TaskFilters'
import TaskMetrics from '../components/tasks/TaskMetrics'
import TaskModal from '../components/tasks/TaskModal'
import TaskTable from '../components/tasks/TaskTable'
import TasksDashboard from '../components/tasks/TasksDashboard'
import {
  acceptTask,
  addTaskComment,
  applyChecklistTemplate,
  completeChecklistItem,
  completeTask,
  createChecklistTemplate,
  createTask,
  createTaskDependency,
  declineTask,
  deleteTask,
  deleteTaskDependency,
  getChecklistTemplates,
  getTaskAlerts,
  getTaskMetrics,
  getTaskNotifications,
  getTasks,
  getTaskStaff,
  markTaskNotificationRead,
  markTaskBlocked,
  markTaskWaiting,
  addTaskProgressUpdate,
  reassignTask,
  resumeTask,
  startTaskWork,
  updateTask,
  updateTaskAlert,
  updateChecklistItem,
  uploadTaskAttachment,
  transitionTask,
} from '../services/tasks.service'

const initialFilters = {
  search: '',
  status: '',
  priority: '',
  task_type: '',
  assigned_user: '',
  assigned_role: '',
  due_date: '',
}

function listFromResponse(data) {
  return Array.isArray(data) ? data : data?.results || []
}

export default function TasksPage() {
  const { user } = useAuth() || {}
  const location = useLocation()
  const canCreate = hasPermission(user, 'tasks.create')
  const canAssign = hasPermission(user, 'tasks.assign')
  const canDelete = user?.role === 'admin' || user?.is_superuser
  const [view, setView] = useState('list')
  const [filters, setFilters] = useState(initialFilters)
  const [tasks, setTasks] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [templates, setTemplates] = useState([])
  const [alerts, setAlerts] = useState([])
  const [staff, setStaff] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const creationRequested = location.pathname === '/tasks/new' || new URLSearchParams(location.search).get('action') === 'new'
  const requestedTaskId = new URLSearchParams(location.search).get('task')

  const requestParams = useMemo(() => {
    return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
  }, [filters])

  useEffect(() => {
    loadReferences()
  }, [])

  useEffect(() => {
    if (creationRequested && canCreate) openCreate()
  }, [creationRequested, canCreate])

  useEffect(() => {
    const timeout = setTimeout(loadTasks, 250)
    return () => clearTimeout(timeout)
  }, [requestParams])

  useEffect(() => {
    const interval = setInterval(loadNotifications, 15000)
    return () => clearInterval(interval)
  }, [])

  async function loadReferences() {
    const [staffData, templateData] = await Promise.all([
      getTaskStaff(),
      getChecklistTemplates(),
    ])
    setStaff(staffData)
    setTemplates(templateData)
  }

  async function loadTasks() {
    try {
      setLoading(true)
      setError('')
      const [taskData, metricData, alertData, notificationData] = await Promise.all([
        getTasks(requestParams),
        getTaskMetrics(),
        getTaskAlerts({ status: 'open' }),
        getTaskNotifications(),
      ])
      const taskList = listFromResponse(taskData)
      setTasks(taskList)
      setMetrics(metricData)
      setAlerts(alertData)
      setNotifications(notificationData)
      if (requestedTaskId) {
        setSelectedTask(taskList.find(task => String(task.id) === String(requestedTaskId)) || null)
      } else if (selectedTask) {
        const refreshed = taskList.find(task => task.id === selectedTask.id)
        setSelectedTask(refreshed || null)
      }
    } catch {
      setError('Unable to load task data.')
    } finally {
      setLoading(false)
    }
  }

  async function loadNotifications() {
    try {
      const [notificationData, metricData] = await Promise.all([
        getTaskNotifications(),
        getTaskMetrics(),
      ])
      setNotifications(notificationData)
      setMetrics(metricData)
    } catch {
      return null
    }
  }

  function openCreate() {
    if (!canCreate) return
    setEditingTask(null)
    setSuccessMessage('')
    setShowModal(true)
  }

  function openEdit(task) {
    setEditingTask(task)
    setSuccessMessage('')
    setShowModal(true)
  }

  async function saveTask(task, payload) {
    const savedTask = task?.id ? await updateTask(task.id, payload) : await createTask(payload)
    setShowModal(false)
    setEditingTask(null)
    setSuccessMessage(task?.id ? 'Task updated successfully' : 'Task created successfully')
    await loadTasks()
    return savedTask
  }

  async function handleAccept(task) {
    await acceptTask(task.id)
    await loadTasks()
  }

  async function handleDecline(task, payload = {}) {
    const reason = payload.reason?.trim()
    if (!reason) {
      setError('Open the task details to provide a decline reason.')
      return
    }
    await declineTask(task.id, reason)
    await loadTasks()
  }

  async function handleComplete(task, payload = {}) {
    const summary = payload.summary?.trim()
    if (!summary) {
      setError('Open the task details to provide a completion summary.')
      return
    }
    await completeTask(task.id, { summary })
    await loadTasks()
  }

  async function handleStartWork(task) {
    await startTaskWork(task.id, { note: 'Work started.' })
    await loadTasks()
  }

  async function handleWaiting(task, payload) {
    await markTaskWaiting(task.id, payload)
    await loadTasks()
  }

  async function handleBlocked(task, payload) {
    await markTaskBlocked(task.id, payload)
    await loadTasks()
  }

  async function handleResume(task) {
    await resumeTask(task.id, { note: 'Task resumed.' })
    await loadTasks()
  }

  async function handleTransition(task, payload) {
    await transitionTask(task.id, payload)
    await loadTasks()
  }

  async function handleProgressUpdate(task, payload) {
    await addTaskProgressUpdate(task.id, payload)
    await loadTasks()
  }

  async function handleAttachmentUpload(task, payload) {
    await uploadTaskAttachment({ ...payload, task: task.id })
    await loadTasks()
  }

  async function handleDelete(task) {
    if (!canDelete) return
    if (!window.confirm(`Delete task "${task.title}"? Notes: ${(task.progress_updates || []).length}. Pictures: ${(task.attachments || []).length}. This action is audited.`)) return
    const reason = window.prompt('Enter the deletion reason:')?.trim()
    if (!reason) return
    const hasHistory = (task.progress_updates || []).length || (task.attachments || []).length
    const confirmation = hasHistory ? window.prompt(`Type the exact task title to confirm: ${task.title}`) : ''
    if (hasHistory && confirmation !== task.title) return
    await deleteTask(task.id, { reason, confirmation })
    if (selectedTask?.id === task.id) setSelectedTask(null)
    await loadTasks()
  }

  async function handleNotificationOpen(notification) {
    await markTaskNotificationRead(notification.id)
    const task = tasks.find(item => item.id === notification.task)
    if (task) setSelectedTask(task)
    await loadTasks()
  }

  async function handleReassign(task, payload) {
    await reassignTask(task.id, payload)
    await loadTasks()
  }

  async function handleChecklistToggle(item) {
    if (item.is_completed) await updateChecklistItem(item.id, { is_completed: false, completed_by: null, completed_at: null })
    else await completeChecklistItem(item.id)
    await loadTasks()
  }

  async function handleApplyTemplate(task, template) {
    await applyChecklistTemplate(task.id, template)
    await loadTasks()
  }

  async function handleComment(payload) {
    await addTaskComment(payload)
    await loadTasks()
  }

  async function handleDependencyCreate(payload) {
    await createTaskDependency(payload)
    await loadTasks()
  }

  async function handleDependencyDelete(dependency) {
    await deleteTaskDependency(dependency.id)
    await loadTasks()
  }

  async function handleAlertAction(alert, action) {
    await updateTaskAlert(alert.id, action)
    await loadTasks()
  }

  async function handleCreateTemplate(payload) {
    await createChecklistTemplate(payload)
    setTemplates(await getChecklistTemplates())
  }

  const unreadNotifications = notifications.filter(notification => !notification.is_read)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500">Practice administration, clinical follow-up, checklist, and alert workflows.</p>
        </div>
        {canCreate && <button type="button" onClick={openCreate} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          New task
        </button>}
      </div>

      {creationRequested && !canCreate && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">Task creation is restricted to administrators. You can continue managing tasks assigned to you.</div>}

      {successMessage && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          {successMessage}
        </div>
      )}

      {unreadNotifications.length > 0 && (
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-blue-900">Task Notifications</h2>
            <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">{unreadNotifications.length}</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
            {unreadNotifications.slice(0, 4).map(notification => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNotificationOpen(notification)}
                className="rounded-md border border-blue-200 bg-white p-3 text-left hover:border-blue-400"
              >
                <span className="block text-sm font-semibold text-gray-900">{notification.title}</span>
                <span className="mt-1 block text-xs text-gray-600">{notification.message}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <TaskMetrics metrics={metrics} />
      <TasksDashboard metrics={metrics} />
      <TaskFilters filters={filters} staff={staff} onChange={setFilters} onReset={() => setFilters(initialFilters)} />

      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
        {[
          ['list', 'List'],
          ['board', 'Board'],
          ...(canCreate ? [['templates', 'Templates']] : []),
          ['alerts', 'Alerts'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${view === key ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
      {loading && <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-500">Loading tasks...</div>}

      {!loading && view === 'list' && (
        <TaskTable tasks={tasks} onOpen={setSelectedTask} onAccept={handleAccept} onDecline={handleDecline} onComplete={handleComplete} canDelete={canDelete} canExecute={!canAssign} onDelete={handleDelete} />
      )}
      {!loading && view === 'board' && (
        <TaskBoard tasks={tasks} onOpen={setSelectedTask} onAccept={handleAccept} onDecline={handleDecline} onComplete={handleComplete} canExecute={!canAssign} />
      )}
      {!loading && view === 'templates' && canCreate && (
        <ChecklistTemplateManager templates={templates} onCreate={handleCreateTemplate} />
      )}
      {!loading && view === 'alerts' && (
        <TaskAlerts alerts={alerts} onAction={handleAlertAction} />
      )}

      {showModal && (editingTask || canCreate) && (
        <TaskModal
          task={editingTask}
          staff={staff}
          onClose={() => setShowModal(false)}
          onSave={saveTask}
          canAssign={canAssign}
        />
      )}

      <TaskDrawer
        task={selectedTask}
        tasks={tasks}
        staff={staff}
        templates={templates}
        onClose={() => setSelectedTask(null)}
        onEdit={openEdit}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onStartWork={handleStartWork}
        onWaiting={handleWaiting}
        onBlocked={handleBlocked}
        onResume={handleResume}
        onProgressUpdate={handleProgressUpdate}
        onAttachmentUpload={handleAttachmentUpload}
        onComplete={handleComplete}
        onDelete={handleDelete}
        onReassign={handleReassign}
        onChecklistToggle={handleChecklistToggle}
        onApplyTemplate={handleApplyTemplate}
        onComment={handleComment}
        onDependencyCreate={handleDependencyCreate}
        onDependencyDelete={handleDependencyDelete}
        onTransition={handleTransition}
        canAssign={canAssign}
        canDelete={canDelete}
      />
    </div>
  )
}
