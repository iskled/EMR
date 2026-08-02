import { useState } from 'react'

export default function DependencyPanel({ task, tasks, onCreate, onDelete }) {
  const [dependsOn, setDependsOn] = useState('')

  async function addDependency() {
    if (!dependsOn) return
    await onCreate({ task: task.id, depends_on: dependsOn })
    setDependsOn('')
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-gray-900">Dependencies</h3>
      <div className="mt-3 space-y-2">
        {task.dependencies?.map(dep => (
          <div key={dep.id} className="flex items-center justify-between rounded-md bg-gray-50 p-2 text-sm">
            <span>{dep.depends_on_title} ({dep.depends_on_status?.replaceAll('_', ' ')})</span>
            <button type="button" onClick={() => onDelete(dep)} className="text-xs font-semibold text-red-600">Remove</button>
          </div>
        ))}
        {!task.dependencies?.length && <p className="text-sm text-gray-500">No dependencies.</p>}
      </div>
      <div className="mt-3 flex gap-2">
        <select value={dependsOn} onChange={event => setDependsOn(event.target.value)} className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Depends on...</option>
          {tasks.filter(item => item.id !== task.id).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <button type="button" onClick={addDependency} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Add</button>
      </div>
    </section>
  )
}
