import { useState } from 'react'

export default function TaskComments({ task, onAdd }) {
  const [body, setBody] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!body.trim()) return
    await onAdd({ task: task.id, body })
    setBody('')
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-gray-900">Comments</h3>
      <div className="mt-3 space-y-3">
        {task.comments?.map(comment => (
          <div key={comment.id} className="rounded-md bg-gray-50 p-3 text-sm">
            <p className="font-medium text-gray-900">{comment.author_name}</p>
            <p className="mt-1 text-gray-700">{comment.body}</p>
          </div>
        ))}
        {!task.comments?.length && <p className="text-sm text-gray-500">No comments yet.</p>}
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input value={body} onChange={event => setBody(event.target.value)} placeholder="Add a comment" className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Add</button>
      </form>
    </section>
  )
}
