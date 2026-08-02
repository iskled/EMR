import { TASK_STATUSES } from '../../services/tasks.service'

export default function TaskBoard({ tasks, onOpen, onComplete }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      {TASK_STATUSES.filter(status => status.value !== 'cancelled').map(status => {
        const columnTasks = tasks.filter(task => task.status === status.value)
        return (
          <section key={status.value} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">{status.label}</h3>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{columnTasks.length}</span>
            </div>
            <div className="space-y-3">
              {columnTasks.map(task => (
                <article key={task.id} className="rounded-md border border-gray-200 p-3">
                  <button type="button" onClick={() => onOpen(task)} className="text-left text-sm font-semibold text-blue-700 hover:text-blue-900">{task.title}</button>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span className="capitalize">{task.priority}</span>
                    <span>{task.due_date || 'No due date'}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">{task.assigned_user_name || task.assigned_role || 'Unassigned'}</p>
                  {task.status !== 'completed' && (
                    <button type="button" onClick={() => onComplete(task)} className="mt-3 w-full rounded-md bg-green-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
                      Complete
                    </button>
                  )}
                </article>
              ))}
              {!columnTasks.length && <p className="rounded-md border border-dashed border-gray-200 p-3 text-xs text-gray-500">Empty</p>}
            </div>
          </section>
        )
      })}
    </div>
  )
}
