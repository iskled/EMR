export default function TaskTable({ tasks, onOpen, onComplete, onClaim }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Task</th>
            <th className="px-4 py-3">Workflow</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Due</th>
            <th className="px-4 py-3">Assignee</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tasks.map(task => (
            <tr key={task.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <button type="button" onClick={() => onOpen(task)} className="text-left font-semibold text-blue-700 hover:text-blue-900">
                  {task.title}
                </button>
                <p className="mt-1 line-clamp-1 text-xs text-gray-500">{task.patient_name || task.inventory_item_name || task.appointment_label || task.description}</p>
              </td>
              <td className="px-4 py-3 capitalize">{task.task_type.replaceAll('_', ' ')}</td>
              <td className="px-4 py-3 capitalize">{task.priority}</td>
              <td className={`px-4 py-3 ${task.is_overdue ? 'font-semibold text-red-600' : 'text-gray-700'}`}>{task.due_date || '-'}</td>
              <td className="px-4 py-3">{task.assigned_user_name || task.assigned_role || 'Unassigned'}</td>
              <td className="px-4 py-3 capitalize">{task.status.replaceAll('_', ' ')}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => onClaim(task)} className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">Claim</button>
                  <button type="button" onClick={() => onComplete(task)} className="rounded-md bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700">Complete</button>
                </div>
              </td>
            </tr>
          ))}
          {!tasks.length && (
            <tr>
              <td colSpan="7" className="px-4 py-10 text-center text-gray-500">No tasks match the active filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
