import { useEffect, useState } from 'react'
import {
  getReminders,
  permanentlyDeleteReminder,
  restoreReminder,
} from '../services/appointments.service'

export default function ArchivedRemindersPage() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [confirmation, setConfirmation] = useState('')

  async function load() {
    try {
      const data = await getReminders({ archived: true, search })
      setItems(data.results || data || [])
      setError('')
    } catch {
      setError('Archived reminders could not be loaded.')
    }
  }
  useEffect(() => { load() }, [])

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold">Archived Reminders</h1><p className="text-slate-600">Search, restore, or permanently remove archived completed reminders.</p></div>
    <form onSubmit={event => { event.preventDefault(); load() }} className="flex gap-3"><input aria-label="Search archived reminders" className="w-full max-w-lg rounded border p-3" value={search} onChange={event => setSearch(event.target.value)} /><button>Search</button></form>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[800px] text-sm"><thead><tr className="text-left"><th className="p-3">Patient</th><th>Type</th><th>Due</th><th>Completed</th><th>Archived</th><th>Actions</th></tr></thead>
      <tbody>{items.map(item => <tr key={item.id} className="border-t"><td className="p-3">{item.patient_name}</td><td>{item.reminder_type_label}</td><td>{item.due_date}</td><td>{item.completed_at && new Date(item.completed_at).toLocaleString()}</td><td>{item.archived_at && new Date(item.archived_at).toLocaleString()}</td><td className="space-x-3"><button onClick={async () => { await restoreReminder(item.id); await load() }}>Restore</button><button onClick={() => setDeleting(item)} className="text-red-700">Permanently Delete</button></td></tr>)}</tbody>
    </table></div>
    {deleting && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-6"><h2 className="text-xl font-bold">Permanently delete archived reminder?</h2><p className="mt-2">Type DELETE to confirm. This action is restricted to administrators and cannot be undone.</p><input aria-label="Type DELETE to confirm" className="mt-4 w-full rounded border p-3" value={confirmation} onChange={event => setConfirmation(event.target.value)} /><div className="mt-5 flex justify-end gap-3"><button onClick={() => { setDeleting(null); setConfirmation('') }}>Cancel</button><button disabled={confirmation !== 'DELETE'} onClick={async () => { await permanentlyDeleteReminder(deleting.id); setDeleting(null); setConfirmation(''); await load() }}>Delete Permanently</button></div></div></div>}
  </div>
}
