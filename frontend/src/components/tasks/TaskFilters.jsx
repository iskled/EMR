import { STAFF_ROLES, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from '../../services/tasks.service'

export default function TaskFilters({ filters, staff, onChange, onReset }) {
  const update = event => onChange({ ...filters, [event.target.name]: event.target.value })

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-7">
        <input
          name="search"
          value={filters.search}
          onChange={update}
          placeholder="Search tasks"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select name="status" value={filters.status} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {TASK_STATUSES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select name="priority" value={filters.priority} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All priorities</option>
          {TASK_PRIORITIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select name="task_type" value={filters.task_type} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All workflows</option>
          {TASK_TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select name="assigned_user" value={filters.assigned_user} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Any assignee</option>
          {staff.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select>
        <select name="assigned_role" value={filters.assigned_role} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Any role</option>
          {STAFF_ROLES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input name="due_date" value={filters.due_date} onChange={update} type="date" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={onReset} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Reset
        </button>
      </div>
    </div>
  )
}
