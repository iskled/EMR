import { useEffect, useRef, useState } from 'react'
import { searchPatients } from '../../services/patients.service'

function patientLabel(patient) {
  if (!patient) return ''
  return `${patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim()}`
}

export function patientSummary(patient) {
  if (!patient) return ''
  return `${patient.patient_code || '-'} - ${patient.phone_primary || 'No phone'}`
}

export default function PatientSearchSelect({ selectedPatient, onSelect, disabled = false }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (selectedPatient || query.trim().length < 2) {
      setResults([])
      setLoading(false)
      setError('')
      return undefined
    }
    let active = true
    const timeout = setTimeout(async () => {
      try {
        setLoading(true)
        setError('')
        const data = await searchPatients(query)
        if (active) {
          setResults(data)
          setHighlighted(0)
        }
      } catch {
        if (active) setError('Unable to search patients.')
      } finally {
        if (active) setLoading(false)
      }
    }, 300)
    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [query, selectedPatient])

  function choose(patient) {
    onSelect?.(patient)
    setQuery('')
    setResults([])
  }

  function handleKeyDown(event) {
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted(index => Math.min(index + 1, results.length - 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted(index => Math.max(index - 1, 0))
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      choose(results[highlighted])
    }
  }

  if (selectedPatient) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs font-bold uppercase text-blue-700">Linked Patient</p>
        <p className="mt-1 font-semibold text-gray-900">{patientLabel(selectedPatient)}</p>
        <p className="text-sm text-gray-600">{patientSummary(selectedPatient)}</p>
        {!disabled && (
          <button type="button" className="mt-3 text-sm font-semibold text-blue-700 hover:underline" onClick={() => onSelect?.(null)}>
            Change Patient
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative space-y-2">
      <label className="block text-base font-semibold text-gray-800">Patient <span className="text-red-500">*</span></label>
      <input
        ref={inputRef}
        value={query}
        onChange={event => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Search by patient name, patient code, or phone"
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoComplete="off"
      />
      {loading && <p className="text-sm text-gray-500">Searching patients...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && query.trim().length >= 2 && !results.length && <p className="text-sm text-gray-500">No patients found.</p>}
      {results.length > 0 && (
        <div className="absolute z-20 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
          {results.map((patient, index) => (
            <button
              type="button"
              key={patient.id}
              onMouseDown={event => event.preventDefault()}
              onClick={() => choose(patient)}
              className={`block w-full px-4 py-3 text-left text-sm ${index === highlighted ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <span className="block font-semibold text-gray-900">{patientLabel(patient)}</span>
              <span className="text-gray-500">{patientSummary(patient)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
