import AssignmentPanel from './AssignmentPanel'
import ChecklistPanel from './ChecklistPanel'
import DependencyPanel from './DependencyPanel'
import TaskActivityTimeline from './TaskActivityTimeline'
import TaskComments from './TaskComments'

export default function TaskDrawer({
  task,
  tasks,
  staff,
  templates,
  onClose,
  onEdit,
  onComplete,
  onReassign,
  onChecklistToggle,
  onApplyTemplate,
  onComment,
  onDependencyCreate,
  onDependencyDelete,
}) {
  if (!task) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <aside className="h-full w-full max-w-3xl overflow-y-auto bg-gray-50 p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
            <p className="mt-1 text-sm capitalize text-gray-600">{task.task_type.replaceAll('_', ' ')} - {task.status.replaceAll('_', ' ')}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => onEdit(task)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700">Edit</button>
            <button type="button" onClick={() => onComplete(task)} className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white">Complete</button>
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700">Close</button>
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
          </section>
          <AssignmentPanel task={task} staff={staff} onReassign={onReassign} />
          <ChecklistPanel task={task} templates={templates} onToggle={onChecklistToggle} onApplyTemplate={onApplyTemplate} />
          <DependencyPanel task={task} tasks={tasks} onCreate={onDependencyCreate} onDelete={onDependencyDelete} />
          <TaskComments task={task} onAdd={onComment} />
          <TaskActivityTimeline task={task} />
        </div>
      </aside>
    </div>
  )
}
