import { useEffect, useMemo, useState } from 'react'
import AuditDrawer from '../components/audit/AuditDrawer'
import AuditExportMenu from '../components/audit/AuditExportMenu'
import AuditFilters from '../components/audit/AuditFilters'
import AuditMetrics from '../components/audit/AuditMetrics'
import AuditTable from '../components/audit/AuditTable'
import { clearAuditEvents, exportAuditEvents, getAuditEvents, getAuditMetrics } from '../services/audit.service'

const initialFilters = {
  search: '',
  start_date: '',
  end_date: '',
  user_role: '',
  action: '',
  source_module: '',
  resource_type: '',
  success: '',
}

function listFromResponse(data) {
  return Array.isArray(data) ? data : data?.results || []
}

export default function AuditLogPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [events, setEvents] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clearing, setClearing] = useState(false)
  const [notice, setNotice] = useState('')

  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')), [filters])

  useEffect(() => {
    const timeout = setTimeout(loadAudit, 250)
    return () => clearTimeout(timeout)
  }, [params])

  async function loadAudit() {
    try {
      setLoading(true)
      setError('')
      const [eventData, metricData] = await Promise.all([getAuditEvents(params), getAuditMetrics(params)])
      setEvents(listFromResponse(eventData))
      setMetrics(metricData)
    } catch {
      setError('Unable to load audit trail.')
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    const blob = await exportAuditEvents(params)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'audit-events.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleClearAll() {
    try {
      setClearing(true)
      setError('')
      const result = await clearAuditEvents()
      setSelected(null)
      setNotice(`${result.cleared} audit log${result.cleared === 1 ? '' : 's'} cleared.`)
      await loadAudit()
    } catch {
      setError('Unable to clear audit logs.')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-sm text-gray-500">Append-only activity, security, and clinical event history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleClearAll} disabled={clearing || !events.length} className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
            {clearing ? 'Clearing…' : 'Clear all logs'}
          </button>
          <AuditExportMenu onExport={handleExport} />
        </div>
      </div>
      {notice && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{notice}</div>}
      <AuditMetrics metrics={metrics} />
      <AuditFilters filters={filters} onChange={setFilters} onReset={() => setFilters(initialFilters)} />
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
      {loading ? <div className="rounded-lg border bg-white p-10 text-center text-gray-500">Loading audit trail...</div> : <AuditTable events={events} onOpen={setSelected} />}
      <AuditDrawer event={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
