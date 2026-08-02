import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import QuickActions from '../components/dashboard/QuickActions'
import PatientTasksPanel from '../components/patients/PatientTasksPanel'
import TaskModal from '../components/tasks/TaskModal'
import { hasPermission } from '../permissions/permissions'
import TasksPage from './TasksPage'

const state = vi.hoisted(() => ({ user: { role: 'admin' } }))
const service = vi.hoisted(() => ({
  acceptTask: vi.fn(),
  addTaskComment: vi.fn(),
  applyChecklistTemplate: vi.fn(),
  completeChecklistItem: vi.fn(),
  completeTask: vi.fn(),
  createChecklistTemplate: vi.fn(),
  createTask: vi.fn(),
  createTaskDependency: vi.fn(),
  declineTask: vi.fn(),
  deleteTask: vi.fn(),
  deleteTaskDependency: vi.fn(),
  getChecklistTemplates: vi.fn(),
  getTaskAlerts: vi.fn(),
  getTaskMetrics: vi.fn(),
  getTaskNotifications: vi.fn(),
  getTasks: vi.fn(),
  getTaskStaff: vi.fn(),
  markTaskNotificationRead: vi.fn(),
  reassignTask: vi.fn(),
  updateChecklistItem: vi.fn(),
  updateTask: vi.fn(),
  updateTaskAlert: vi.fn(),
}))

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock('../services/tasks.service', () => ({
  ...service,
  TASK_TYPES: [{ value: 'administrative', label: 'Administrative' }],
  TASK_PRIORITIES: [{ value: 'normal', label: 'Normal' }],
  TASK_STATUSES: [
    { value: 'pending_acceptance', label: 'Pending Acceptance' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'in_progress', label: 'In Progress' },
  ],
  STAFF_ROLES: [{ value: 'admin', label: 'Admin' }, { value: 'dentist', label: 'Dentist' }],
}))

const assignedTask = {
  id: 'task-1',
  title: 'Assigned follow-up',
  description: '',
  task_type: 'administrative',
  priority: 'normal',
  status: 'pending_acceptance',
  assigned_user_name: 'Current user',
  assigned_role: '',
  is_overdue: false,
  checklist_items: [],
  dependencies: [],
  comments: [],
  alerts: [],
  assignment_history: [],
}

describe('administrator-controlled task workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.user = { role: 'admin' }
    service.getTasks.mockResolvedValue({ results: [assignedTask] })
    service.getTaskMetrics.mockResolvedValue({})
    service.getTaskStaff.mockResolvedValue([])
    service.getChecklistTemplates.mockResolvedValue([])
    service.getTaskAlerts.mockResolvedValue([])
    service.getTaskNotifications.mockResolvedValue([])
  })

  it('maps tasks.create only to administrators while preserving tasks.write', () => {
    expect(hasPermission({ role: 'admin' }, 'tasks.create')).toBe(true)
    for (const role of ['dentist', 'assistant', 'receptionist']) {
      expect(hasPermission({ role }, 'tasks.create')).toBe(false)
      expect(hasPermission({ role }, 'tasks.write')).toBe(true)
    }
  })

  it('shows dashboard Create Task only when tasks.create is present', () => {
    const { rerender } = render(<QuickActions capabilities={{ 'tasks.create': true }} onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Create Task' })).toBeInTheDocument()
    rerender(<QuickActions capabilities={{ 'tasks.write': true, 'tasks.create': false }} onAction={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Create Task' })).not.toBeInTheDocument()
  })

  it('hides the patient Create task shortcut for non-admin users', async () => {
    state.user = { role: 'dentist' }
    render(<PatientTasksPanel patient={{ id: 'patient-1' }} />)
    await waitFor(() => expect(service.getTasks).toHaveBeenCalled())
    expect(screen.queryByRole('link', { name: 'Create task' })).not.toBeInTheDocument()
  })

  it('denies direct non-admin creation UI and exposes acceptance actions for assigned work', async () => {
    state.user = { role: 'assistant' }
    render(<MemoryRouter initialEntries={['/tasks/new']}><TasksPage /></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('restricted to administrators')
    expect(screen.queryByRole('button', { name: 'New task' })).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Accept' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Templates' })).not.toBeInTheDocument()
  })

  it('keeps the admin creation form available with labelled fields', async () => {
    render(<MemoryRouter initialEntries={['/tasks']}><TasksPage /></MemoryRouter>)
    const button = await screen.findByRole('button', { name: 'New task' })
    fireEvent.click(button)
    expect(screen.getByRole('heading', { name: 'Create Task' })).toBeInTheDocument()
    expect(screen.getByText('Task Details')).toBeInTheDocument()
    expect(screen.getByText('Assignment')).toBeInTheDocument()
    expect(screen.getByText('Schedule')).toBeInTheDocument()
    expect(screen.getByText('Recurrence')).toBeInTheDocument()
    expect(screen.getByText('Linked Records')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Task' })).toBeInTheDocument()
  })

  it('removes protected assignment and recurrence fields from non-admin updates', async () => {
    const onSave = vi.fn().mockResolvedValue()
    render(<TaskModal task={{ ...assignedTask, assigned_user: 'user-1', recurrence: 'weekly', recurrence_weekdays: [1], parent_task: 'parent-1' }} staff={[]} canAssign={false} onClose={vi.fn()} onSave={onSave} />)
    expect(screen.queryByText('Recurrence')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save Task' }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    const payload = onSave.mock.calls[0][1]
    for (const field of ['assigned_user', 'assigned_role', 'recurrence', 'recurrence_interval', 'recurrence_weekdays', 'recurrence_end_date', 'parent_task']) {
      expect(payload).not.toHaveProperty(field)
    }
  })

  it('submits a valid create form once with normalized task payload', async () => {
    const onSave = vi.fn().mockResolvedValue({ id: 'created-task' })
    render(<TaskModal task={null} staff={[{ id: 7, name: 'Active Assistant', role: 'assistant' }]} canAssign onClose={vi.fn()} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Task Title *'), { target: { value: 'Clean the lounge' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Wash the lounge floor' } })
    fireEvent.change(screen.getByLabelText('Priority *'), { target: { value: 'normal' } })
    fireEvent.change(screen.getByLabelText('Assign To Staff Member'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-03' } })
    fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '2026-08-03' } })
    fireEvent.change(screen.getByLabelText('Due Time'), { target: { value: '10:30' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save Task' }))
    fireEvent.click(screen.getByRole('button', { name: 'Saving...' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const payload = onSave.mock.calls[0][1]
    expect(payload.title).toBe('Clean the lounge')
    expect(payload.status).toBe('pending_acceptance')
    expect(payload.assigned_user).toBe(7)
    expect(payload.patient).toBeNull()
    expect(payload.appointment).toBeNull()
    expect(payload.orthodontic_case).toBeNull()
    expect(payload.orthodontic_visit).toBeNull()
    expect(payload.inventory_item).toBeNull()
    expect(payload.inventory_alert).toBeNull()
    expect(payload.recurrence).toBe('none')
    expect(payload).not.toHaveProperty('recurrence_interval')
    expect(payload).not.toHaveProperty('recurrence_end_date')
  })

  it('renders local field validation errors without sending a request', async () => {
    const onSave = vi.fn()
    render(<TaskModal task={null} staff={[]} canAssign onClose={vi.fn()} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-04' } })
    fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '2026-08-03' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Task' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save task')
    expect(screen.getByText('Task title is required.')).toBeInTheDocument()
    expect(screen.getByText('Due date cannot be earlier than start date.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('renders API field and form errors and allows retry', async () => {
    const error = {
      response: {
        data: {
          assigned_user: ['The selected assignee is inactive.'],
        },
      },
    }
    const onSave = vi.fn().mockRejectedValue(error)
    render(<TaskModal task={null} staff={[{ id: 8, name: 'Inactive Assistant', role: 'assistant' }]} canAssign onClose={vi.fn()} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Task Title *'), { target: { value: 'Clean the lounge' } })
    fireEvent.change(screen.getByLabelText('Assign To Staff Member'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Task' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save task')
    expect(screen.getByText('The selected assignee is inactive.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Task' })).toBeEnabled()
  })

  it('closes the modal and refreshes task data after successful creation', async () => {
    service.createTask.mockResolvedValue({ id: 'created-task', title: 'Clean the lounge' })
    render(<MemoryRouter initialEntries={['/tasks']}><TasksPage /></MemoryRouter>)

    fireEvent.click(await screen.findByRole('button', { name: 'New task' }))
    fireEvent.change(screen.getByLabelText('Task Title *'), { target: { value: 'Clean the lounge' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Task' }))

    await waitFor(() => expect(service.createTask).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Create Task' })).not.toBeInTheDocument())
    expect(await screen.findByRole('status')).toHaveTextContent('Task created successfully')
    expect(service.getTasks).toHaveBeenCalled()
    expect(service.getTaskMetrics).toHaveBeenCalled()
    expect(service.getTaskNotifications).toHaveBeenCalled()
  })
})
