import { useEffect, useState } from 'react'
import { STAFF_ROLES, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from '../../services/tasks.service'
import RecurrenceEditor from './RecurrenceEditor'

const emptyForm = {
  title: '',
  description: '',
  task_type: 'administrative',
  priority: 'normal',
  status: 'not_started',
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

function normalizeTask(task) {
  if (!task) return emptyForm
  return {
    ...emptyForm,
    ...task,
    assigned_user: task.assigned_user || '',
    assigned_role: task.assigned_role || '',
    due_time: task.due_time || '',
    start_date: task.start_date || '',
    due_date: task.due_date || '',
    recurrence_end_date: task.recurrence_end_date || '',
    tags: Array.isArray(task.tags) ? task.tags.join(', ') : '',
  }
}

export default function TaskModal({ task, staff, onClose, onSave }) {
  const [form, setForm] = useState(normalizeTask(task))

  useEffect(() => {
    setForm(normalizeTask(task))
  }, [task])

  const update = event => setForm({ ...form, [event.target.name]: event.target.value })

  async function submit(event) {
    event.preventDefault()
    const payload = {
      ...form,
      assigned_user: form.assigned_user || null,
      assigned_role: form.assigned_user ? '' : form.assigned_role,
      recurrence_interval: Number(form.recurrence_interval || 1),
      tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
    }
    ;['patient', 'appointment', 'orthodontic_case', 'orthodontic_visit', 'inventory_item', 'inventory_alert', 'start_date', 'due_date', 'due_time', 'recurrence_end_date'].forEach(key => {
      if (!payload[key]) payload[key] = null
    })
    await onSave(task, payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-[92vw] max-w-6xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{task ? 'Edit task' : 'Create task'}</h2>
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700">Close</button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <input name="title" value={form.title} onChange={update} required placeholder="Task title" className="md:col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <textarea name="description" value={form.description} onChange={update} placeholder="Description" className="md:col-span-2 min-h-24 rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <select name="task_type" value={form.task_type} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {TASK_TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select name="priority" value={form.priority} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {TASK_PRIORITIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select name="status" value={form.status} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {TASK_STATUSES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select name="assigned_user" value={form.assigned_user} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Assign to user</option>
            {staff.map(user => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}
          </select>
          <select name="assigned_role" value={form.assigned_role} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Assign to role</option>
            {STAFF_ROLES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input name="start_date" type="date" value={form.start_date} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="due_date" type="date" value={form.due_date} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="due_time" type="time" value={form.due_time} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="tags" value={form.tags} onChange={update} placeholder="Tags, comma separated" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-gray-900">Recurrence</p>
          <RecurrenceEditor form={form} onChange={setForm} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input name="patient" value={form.patient || ''} onChange={update} placeholder="Patient ID" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="appointment" value={form.appointment || ''} onChange={update} placeholder="Appointment ID" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="orthodontic_case" value={form.orthodontic_case || ''} onChange={update} placeholder="Orthodontic case ID" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="orthodontic_visit" value={form.orthodontic_visit || ''} onChange={update} placeholder="Orthodontic visit ID" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="inventory_item" value={form.inventory_item || ''} onChange={update} placeholder="Inventory item ID" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="inventory_alert" value={form.inventory_alert || ''} onChange={update} placeholder="Inventory alert ID" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
          <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save task</button>
        </div>
      </form>
    </div>
  )
}
