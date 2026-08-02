export default function ChecklistPanel({ task, templates, onToggle, onApplyTemplate }) {
  async function handleTemplate(event) {
    const template = event.target.value
    if (template) await onApplyTemplate(task, template)
    event.target.value = ''
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-900">Checklist</h3>
        <select onChange={handleTemplate} defaultValue="" className="rounded-md border border-gray-300 px-2 py-1.5 text-xs">
          <option value="">Apply template</option>
          {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
      </div>
      <div className="mt-3 space-y-2">
        {task.checklist_items?.map(item => (
          <label key={item.id} className="flex items-start gap-3 rounded-md border border-gray-200 p-3 text-sm">
            <input
              type="checkbox"
              checked={item.is_completed}
              onChange={() => onToggle(item)}
              className="mt-1"
            />
            <span>
              <span className={`block font-medium ${item.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.title}</span>
              {item.is_required && <span className="text-xs text-red-600">Required</span>}
            </span>
          </label>
        ))}
        {!task.checklist_items?.length && <p className="text-sm text-gray-500">No checklist items applied.</p>}
      </div>
    </section>
  )
}
