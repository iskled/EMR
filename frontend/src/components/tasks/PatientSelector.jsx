import { useEffect, useState } from 'react'
import { getPatient, searchPatients } from '../../services/patients.service'

export default function PatientSelector({ value, initialPatient, onChange, disabled = false, placeholder = 'Search by name, patient code, or phone' }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(initialPatient || null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSelected(initialPatient || null)
    if (value && !initialPatient) getPatient(value).then(setSelected).catch(() => setSelected(null))
  }, [value, initialPatient])

  useEffect(() => {
    if (query.trim().length < 2) return setResults([])
    const timer = setTimeout(async () => {
      setLoading(true)
      setError('')
      try { setResults(await searchPatients(query.trim())) }
      catch { setResults([]); setError('Unable to search patient records.') }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  if (selected) return <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
    <p className="font-semibold text-gray-900">{selected.full_name}</p>
    <p className="text-gray-600">{selected.patient_code} · {selected.phone_primary || selected.phone || 'No phone'}</p>
    <button type="button" disabled={disabled} onClick={() => { setSelected(null); onChange('') }} className="mt-2 text-sm font-semibold text-blue-700">Change patient</button>
  </div>

  return <div className="relative">
    <input value={query} onChange={event => setQuery(event.target.value)} disabled={disabled} placeholder={placeholder} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
    {loading && <p className="mt-1 text-xs text-gray-500">Searching patients…</p>}
    {!!results.length && <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white shadow-lg">
      {results.map(patient => <button key={patient.id} type="button" onClick={() => { setSelected(patient); setResults([]); setQuery(''); onChange(patient.id) }} className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-blue-50">
        <span className="block font-semibold">{patient.full_name}</span><span className="text-gray-500">{patient.patient_code} · {patient.phone_primary || 'No phone'}</span>
      </button>)}
    </div>}
    {query.trim().length >= 2 && !loading && !results.length && <p className="mt-1 text-xs text-gray-500">No active patients found.</p>}
    {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
  </div>
}
