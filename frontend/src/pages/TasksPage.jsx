import { useEffect, useMemo, useState } from 'react'
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
  addTaskComment,
  applyChecklistTemplate,
  claimTask,
  completeChecklistItem,
  completeTask,
  createChecklistTemplate,
  createTask,
  createTaskDependency,
  deleteTaskDependency,
  getChecklistTemplates,
  getTaskAlerts,
  getTaskMetrics,
  getTasks,
  getTaskStaff,
  reassignTask,
  updateTask,
  updateTaskAlert,
  updateChecklistItem,
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
  const [view, setView] = useState('list')
  const [filters, setFilters] = useState(initialFilters)
  const [tasks, setTasks] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [templates, setTemplates] = useState([])
  const [alerts, setAlerts] = useState([])
  const [staff, setStaff] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const requestParams = useMemo(() => {
    return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
  }, [filters])

  useEffect(() => {
    loadReferences()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(loadTasks, 250)
    return () => clearTimeout(timeout)
  }, [requestParams])

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
      const [taskData, metricData, alertData] = await Promise.all([
        getTasks(requestParams),
        getTaskMetrics(),
        getTaskAlerts({ status: 'open' }),
      ])
      const taskList = listFromResponse(taskData)
      setTasks(taskList)
      setMetrics(metricData)
      setAlerts(alertData)
      if (selectedTask) {
        const refreshed = taskList.find(task => task.id === selectedTask.id)
        setSelectedTask(refreshed || null)
      }
    } catch {
      setError('Unable to load task data.')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingTask(null)
    setShowModal(true)
  }

  function openEdit(task) {
    setEditingTask(task)
    setShowModal(true)
  }

  async function saveTask(task, payload) {
    if (task?.id) await updateTask(task.id, payload)
    else await createTask(payload)
    setShowModal(false)
    setEditingTask(null)
    await loadTasks()
  }

  async function handleComplete(task) {
    await completeTask(task.id)
    await loadTasks()
  }

  async function handleClaim(task) {
    await claimTask(task.id)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500">Practice administration, clinical follow-up, checklist, and alert workflows.</p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          New task
        </button>
      </div>

      <TaskMetrics metrics={metrics} />
      <TasksDashboard metrics={metrics} />
      <TaskFilters filters={filters} staff={staff} onChange={setFilters} onReset={() => setFilters(initialFilters)} />

      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
        {[
          ['list', 'List'],
          ['board', 'Board'],
          ['templates', 'Templates'],
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
        <TaskTable tasks={tasks} onOpen={setSelectedTask} onComplete={handleComplete} onClaim={handleClaim} />
      )}
      {!loading && view === 'board' && (
        <TaskBoard tasks={tasks} onOpen={setSelectedTask} onComplete={handleComplete} />
      )}
      {!loading && view === 'templates' && (
        <ChecklistTemplateManager templates={templates} onCreate={handleCreateTemplate} />
      )}
      {!loading && view === 'alerts' && (
        <TaskAlerts alerts={alerts} onAction={handleAlertAction} />
      )}

      {showModal && (
        <TaskModal
          task={editingTask}
          staff={staff}
          onClose={() => setShowModal(false)}
          onSave={saveTask}
        />
      )}

      <TaskDrawer
        task={selectedTask}
        tasks={tasks}
        staff={staff}
        templates={templates}
        onClose={() => setSelectedTask(null)}
        onEdit={openEdit}
        onComplete={handleComplete}
        onReassign={handleReassign}
        onChecklistToggle={handleChecklistToggle}
        onApplyTemplate={handleApplyTemplate}
        onComment={handleComment}
        onDependencyCreate={handleDependencyCreate}
        onDependencyDelete={handleDependencyDelete}
      />
    </div>
  )
}
