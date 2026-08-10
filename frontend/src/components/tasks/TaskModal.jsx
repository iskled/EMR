import { useEffect, useState } from 'react'
import { STAFF_ROLES, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from '../../services/tasks.service'
import RecurrenceEditor from './RecurrenceEditor'
import PatientSelector from './PatientSelector'

const emptyForm = {
  title: '',
  description: '',
  task_type: 'administrative',
  priority: 'normal',
  status: 'pending_acceptance',
  assigned_user: '',
  assigned_role: '',
  start_date: '',
  due_date: '',
  due_time: '',
  recurrence: 'none',
  recurrence_interval: 1,
  recurrence_end_date: '',
  patient: '',
  appointment: '',
  orthodontic_case: '',
  orthodontic_visit: '',
  inventory_item: '',
  inventory_alert: '',
  tags: '',
}

const linkedRecordFields = ['patient', 'appointment', 'orthodontic_case', 'orthodontic_visit', 'inventory_item', 'inventory_alert']
const scheduleFields = ['start_date', 'due_date', 'due_time']
const protectedFields = ['assigned_user', 'assigned_role', 'recurrence', 'recurrence_interval', 'recurrence_weekdays', 'recurrence_end_date', 'parent_task']

function normalizeTask(task) {
  if (!task) return { ...emptyForm }
  return {
    ...emptyForm,
    ...task,
    assigned_user: task.assigned_user || '',
    assigned_role: task.assigned_role || '',
    due_time: task.due_time ? String(task.due_time).slice(0, 5) : '',
    start_date: task.start_date || '',
    due_date: task.due_date || '',
    recurrence_end_date: task.recurrence_end_date || '',
    tags: Array.isArray(task.tags) ? task.tags.join(', ') : '',
  }
}

function Field({ label, required = false, children, className = '', error }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-semibold text-gray-800">
        {label}{required && <span className="text-red-600"> *</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-700">{error}</span>}
    </label>
  )
}

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500'

function firstError(value) {
  if (!value) return ''
  if (Array.isArray(value)) return value.map(firstError).filter(Boolean).join(' ')
  if (typeof value === 'object') return Object.values(value).map(firstError).filter(Boolean).join(' ')
  return String(value)
}

function extractErrors(error) {
  const data = error?.response?.data
  if (!data) {
    return {
      formError: 'Unable to create task. Please check your connection and try again.',
      fieldErrors: {},
    }
  }
  if (typeof data === 'string') {
    return { formError: data, fieldErrors: {} }
  }
  const fieldErrors = {}
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'detail' && key !== 'non_field_errors' && key !== 'error') {
      fieldErrors[key] = firstError(value)
    }
  })
  return {
    formError: firstError(data.detail || data.non_field_errors || data.error) || 'Unable to save task. Review the highlighted fields and try again.',
    fieldErrors,
  }
}

function validateForm(form) {
  const errors = {}
  if (!form.title.trim()) errors.title = 'Task title is required.'
  if (!form.task_type) errors.task_type = 'Category is required.'
  if (!form.priority) errors.priority = 'Priority is required.'
  if (form.start_date && form.due_date && form.due_date < form.start_date) {
    errors.due_date = 'Due date cannot be earlier than start date.'
  }
  if (form.recurrence !== 'none' && Number(form.recurrence_interval || 0) < 1) {
    errors.recurrence_interval = 'Repeat interval must be at least 1.'
  }
  if (form.recurrence !== 'none' && form.recurrence_end_date && form.due_date && form.recurrence_end_date < form.due_date) {
    errors.recurrence_end_date = 'Repeat until cannot be earlier than the due date.'
  }
  if (form.assigned_user && form.assigned_role) {
    errors.assigned_role = 'Assign to either a staff member or a role, not both.'
  }
  return errors
}

function buildPayload(form, canAssign) {
  const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
    task_type: form.task_type,
    priority: form.priority,
    status: form.status || 'pending_acceptance',
    recurrence: form.recurrence || 'none',
    tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
  }

  if (form.assigned_user) payload.assigned_user = Number(form.assigned_user)
  if (!form.assigned_user && form.assigned_role) payload.assigned_role = form.assigned_role

  scheduleFields.forEach(key => {
    if (form[key]) payload[key] = form[key]
  })

  linkedRecordFields.forEach(key => {
    payload[key] = form[key] ? (key === 'patient' ? form[key] : Number(form[key])) : null
  })

  if (payload.recurrence === 'none') {
    delete payload.recurrence_interval
    delete payload.recurrence_end_date
    delete payload.recurrence_weekdays
  } else {
    payload.recurrence_interval = Number(form.recurrence_interval || 1)
    if (form.recurrence_end_date) payload.recurrence_end_date = form.recurrence_end_date
  }

  if (!canAssign) {
    protectedFields.forEach(key => delete payload[key])
  }

  return payload
}

export default function TaskModal({ task, staff, onClose, onSave, canAssign = true, initialPatientId = '' }) {
  const [form, setForm] = useState(() => ({ ...normalizeTask(task), patient: task?.patient || initialPatientId || '' }))
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [staffSearch, setStaffSearch] = useState('')

  useEffect(() => {
    setForm({ ...normalizeTask(task), patient: task?.patient || initialPatientId || '' })
    setFieldErrors({})
    setFormError('')
    setIsSubmitting(false)
  }, [task, initialPatientId])

  const update = event => {
    const { name, value } = event.target
    setForm(current => ({ ...current, [name]: value }))
    setFieldErrors(current => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  async function submit(event) {
    event.preventDefault()
    if (isSubmitting) return

    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setFormError('Unable to save task. Review the highlighted fields and try again.')
      return
    }

    setIsSubmitting(true)
    setFieldErrors({})
    setFormError('')

    try {
      await onSave(task, buildPayload(form, canAssign))
      setForm({ ...emptyForm })
    } catch (error) {
      const parsed = extractErrors(error)
      setFormError(parsed.formError)
      setFieldErrors(parsed.fieldErrors)
    } finally {
      setIsSubmitting(false)
    }
  }

  const eligibleStaff = staff.filter(member => member.is_active !== false)
  const filteredStaff = eligibleStaff.filter(member => {
    const haystack = [
      member.full_name,
      member.display_name,
      member.name,
      member.first_name,
      member.last_name,
      member.role,
      member.email,
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(staffSearch.toLowerCase())
  })

  function staffLabel(member) {
    const name = member.full_name || member.name || member.email
    return `${name} - ${member.role || 'staff'} - ${member.email}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <form onSubmit={submit} className="max-h-[94vh] w-full max-w-[1200px] overflow-y-auto rounded-lg bg-white p-5 shadow-xl xl:min-w-[1100px]" noValidate>
        <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{task ? 'Edit Task' : 'Create Task'}</h2>
            <p className="text-sm text-gray-500">Assigned tasks enter pending acceptance until the assignee accepts them.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">Close</button>
        </div>

        {formError && (
          <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {formError}
          </div>
        )}

        <section className="mt-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">Task Details</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Task Title" required className="md:col-span-2 xl:col-span-4" error={fieldErrors.title}>
              <input name="title" value={form.title} onChange={update} required className={inputClass} disabled={isSubmitting} />
            </Field>
            <Field label="Description" className="md:col-span-2 xl:col-span-4" error={fieldErrors.description}>
              <textarea name="description" value={form.description} onChange={update} className={`${inputClass} min-h-24`} disabled={isSubmitting} />
            </Field>
            <Field label="Category" required error={fieldErrors.task_type}>
              <select name="task_type" value={form.task_type} onChange={update} required className={inputClass} disabled={isSubmitting}>
                {TASK_TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Priority" required error={fieldErrors.priority}>
              <select name="priority" value={form.priority} onChange={update} required className={inputClass} disabled={isSubmitting}>
                {TASK_PRIORITIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Status" error={fieldErrors.status}>
              <select name="status" value={form.status} onChange={update} className={inputClass} disabled={!task || isSubmitting}>
                {TASK_STATUSES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Tags" error={fieldErrors.tags}>
              <input name="tags" value={form.tags} onChange={update} className={inputClass} disabled={isSubmitting} />
            </Field>
          </div>
        </section>

        {canAssign && (
          <section className="mt-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">Assignment</h3>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-gray-800">Search Staff</span>
                <input
                  value={staffSearch}
                  onChange={event => setStaffSearch(event.target.value)}
                  className={`${inputClass} mb-2`}
                  disabled={isSubmitting}
                  placeholder="Search staff by name, role, or email"
                />
                </label>
                <Field label="Assign To Staff Member" error={fieldErrors.assigned_user}>
                <select name="assigned_user" value={form.assigned_user} onChange={update} className={inputClass} disabled={isSubmitting}>
                  <option value="">No individual assignee</option>
                  {filteredStaff.map(user => <option key={user.id} value={user.id}>{staffLabel(user)}</option>)}
                </select>
                {!filteredStaff.length && <span className="mt-1 block text-sm text-gray-500">No eligible staff members found.</span>}
                </Field>
              </div>
              <Field label="Assign To Role" error={fieldErrors.assigned_role}>
                <select name="assigned_role" value={form.assigned_role} onChange={update} className={inputClass} disabled={Boolean(form.assigned_user) || isSubmitting}>
                  <option value="">No role assignment</option>
                  {STAFF_ROLES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
            </div>
          </section>
        )}

        <section className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">Schedule</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Start Date" error={fieldErrors.start_date}>
              <input name="start_date" type="date" value={form.start_date} onChange={update} className={inputClass} disabled={isSubmitting} />
            </Field>
            <Field label="Due Date" error={fieldErrors.due_date}>
              <input name="due_date" type="date" value={form.due_date} onChange={update} className={inputClass} disabled={isSubmitting} />
            </Field>
            <Field label="Due Time" error={fieldErrors.due_time}>
              <input name="due_time" type="time" value={form.due_time} onChange={update} className={inputClass} disabled={isSubmitting} />
            </Field>
          </div>
        </section>

        {canAssign && (
          <section className="mt-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">Recurrence</h3>
            <div className="mt-3">
              <RecurrenceEditor form={form} onChange={setForm} disabled={isSubmitting} fieldErrors={fieldErrors} />
            </div>
          </section>
        )}

        <section className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">Linked Records</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Patient" error={fieldErrors.patient} className="md:col-span-2 xl:col-span-3">
              <PatientSelector value={form.patient} initialPatient={task?.patient_detail} onChange={patient => setForm(current => ({ ...current, patient }))} disabled={isSubmitting} />
            </Field>
            <Field label="Appointment ID" error={fieldErrors.appointment}>
              <input name="appointment" type="number" min="1" value={form.appointment || ''} onChange={update} className={inputClass} disabled={isSubmitting} />
            </Field>
            <Field label="Orthodontic Case ID" error={fieldErrors.orthodontic_case}>
              <input name="orthodontic_case" type="number" min="1" value={form.orthodontic_case || ''} onChange={update} className={inputClass} disabled={isSubmitting} />
            </Field>
            <Field label="Orthodontic Visit ID" error={fieldErrors.orthodontic_visit}>
              <input name="orthodontic_visit" type="number" min="1" value={form.orthodontic_visit || ''} onChange={update} className={inputClass} disabled={isSubmitting} />
            </Field>
            <Field label="Inventory Item ID" error={fieldErrors.inventory_item}>
              <input name="inventory_item" type="number" min="1" value={form.inventory_item || ''} onChange={update} className={inputClass} disabled={isSubmitting} />
            </Field>
            <Field label="Inventory Alert ID" error={fieldErrors.inventory_alert}>
              <input name="inventory_alert" type="number" min="1" value={form.inventory_alert || ''} onChange={update} className={inputClass} disabled={isSubmitting} />
            </Field>
          </div>
        </section>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300">
            {isSubmitting ? 'Saving...' : 'Save Task'}
          </button>
        </div>
      </form>
    </div>
  )
}
