import { useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { saveReport } from '../../services/reports.service'

export default function SavedReportsPanel({ savedReports = [], reportType, filters, onRun, onChanged }) {
  const [name, setName] = useState('')
  const [shared, setShared] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (!name) return
    await saveReport({ name, report_type: reportType, filters, is_shared: shared })
    setName('')
    setShared(false)
    await onChanged?.()
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900">Saved Reports</h3>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <Input label="Report name" value={name} onChange={event => setName(event.target.value)} />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={shared} onChange={event => setShared(event.target.checked)} />
          Shared
        </label>
        <Button type="submit">Save Current Report</Button>
      </form>
      <div className="mt-4 space-y-2">
        {savedReports.map(report => (
          <button key={report.id} type="button" onClick={() => onRun?.(report)} className="w-full rounded border border-gray-200 p-3 text-left hover:border-blue-300">
            <p className="font-semibold">{report.name}</p>
            <p className="text-sm text-gray-500">{report.report_type} · {report.is_shared ? 'Shared' : 'Private'}</p>
          </button>
        ))}
        {!savedReports.length && <p className="text-sm text-gray-500">No saved reports yet.</p>}
      </div>
    </div>
  )
}
