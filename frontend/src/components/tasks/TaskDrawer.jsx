import AssignmentPanel from './AssignmentPanel'
import ChecklistPanel from './ChecklistPanel'
import DependencyPanel from './DependencyPanel'
import TaskActivityTimeline from './TaskActivityTimeline'
import TaskComments from './TaskComments'

function formatStatus(value) {
  return value ? value.replaceAll('_', ' ') : ''
}

function canWork(task) {
  return ['accepted', 'in_progress', 'waiting', 'blocked', 'overdue'].includes(task.status)
}

export default function TaskDrawer({
  task,
  tasks,
  staff,
  templates,
  onClose,
  onEdit,
  onAccept,
  onDecline,
  onComplete,
  onDelete,
  onReassign,
  onChecklistToggle,
  onApplyTemplate,
  onComment,
  onDependencyCreate,
  onDependencyDelete,
  canAssign = false,
  canDelete = false,
}) {
  if (!task) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <aside className="h-full w-full max-w-3xl overflow-y-auto bg-gray-50 p-5 shadow-xl">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
            <p className="mt-1 text-sm capitalize text-gray-600">{task.task_type.replaceAll('_', ' ')} - {formatStatus(task.status)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {task.status === 'pending_acceptance' && (
              <>
                <button type="button" onClick={() => onAccept(task)} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Accept</button>
                <button type="button" onClick={() => onDecline(task)} className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Decline</button>
              </>
            )}
            <button type="button" onClick={() => onEdit(task)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Edit</button>
            {canWork(task) && <button type="button" onClick={() => onComplete(task)} className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">Complete</button>}
            {canDelete && <button type="button" onClick={() => onDelete(task)} className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Delete</button>}
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Close</button>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-700">{task.description || 'No description.'}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div><span className="text-gray-500">Priority</span><p className="font-semibold capitalize">{task.priority}</p></div>
              <div><span className="text-gray-500">Due</span><p className="font-semibold">{task.due_date || '-'}</p></div>
              <div><span className="text-gray-500">Patient</span><p className="font-semibold">{task.patient_name || '-'}</p></div>
              <div><span className="text-gray-500">Inventory</span><p className="font-semibold">{task.inventory_item_name || '-'}</p></div>
            </div>
            {task.decline_reason && <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Decline reason: {task.decline_reason}</p>}
          </section>
          {canAssign && <AssignmentPanel task={task} staff={staff} onReassign={onReassign} />}
          <ChecklistPanel task={task} templates={templates} onToggle={onChecklistToggle} onApplyTemplate={onApplyTemplate} />
          <DependencyPanel task={task} tasks={tasks} onCreate={onDependencyCreate} onDelete={onDependencyDelete} />
          <TaskComments task={task} onAdd={onComment} />
          <TaskActivityTimeline task={task} />
        </div>
      </aside>
    </div>
  )
}
