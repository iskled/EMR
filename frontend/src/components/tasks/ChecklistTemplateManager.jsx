import { useState } from 'react'
import { TASK_TYPES } from '../../services/tasks.service'

export default function ChecklistTemplateManager({ templates, onCreate }) {
  const [form, setForm] = useState({ name: '', task_type: 'administrative', description: '', items: '' })

  async function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) return
    await onCreate({
      name: form.name,
      task_type: form.task_type,
      description: form.description,
      items: form.items.split('\n').map((title, index) => title.trim() && ({ title: title.trim(), sort_order: index, is_required: true })).filter(Boolean),
    })
    setForm({ name: '', task_type: 'administrative', description: '', items: '' })
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Checklist templates</h2>
        <div className="mt-4 space-y-3">
          <input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Template name" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <select value={form.task_type} onChange={event => setForm({ ...form, task_type: event.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            {TASK_TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Description" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <textarea value={form.items} onChange={event => setForm({ ...form, items: event.target.value })} placeholder="One checklist item per line" className="min-h-32 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Create template</button>
        </div>
      </form>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {templates.map(template => (
            <article key={template.id} className="rounded-md border border-gray-200 p-3">
              <p className="font-semibold text-gray-900">{template.name}</p>
              <p className="text-xs capitalize text-gray-500">{template.task_type.replaceAll('_', ' ')}</p>
              <ul className="mt-3 space-y-1 text-sm text-gray-700">
                {template.items?.map(item => <li key={item.id}>{item.title}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
