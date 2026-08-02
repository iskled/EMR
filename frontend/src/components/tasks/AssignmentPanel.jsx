import { STAFF_ROLES } from '../../services/tasks.service'

export default function AssignmentPanel({ task, staff, onReassign }) {
  async function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await onReassign(task, {
      assigned_user: form.get('assigned_user'),
      assigned_role: form.get('assigned_role'),
      notes: form.get('notes'),
    })
    event.currentTarget.reset()
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-gray-900">Assignment</h3>
      <p className="mt-1 text-sm text-gray-600">{task.assigned_user_name || task.assigned_role || 'Unassigned'}</p>
      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <select name="assigned_user" defaultValue="" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Assign to user</option>
          {staff.map(user => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}
        </select>
        <select name="assigned_role" defaultValue="" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Assign to role</option>
          {STAFF_ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
        </select>
        <input name="notes" placeholder="Assignment note" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Reassign</button>
      </form>
    </section>
  )
}
