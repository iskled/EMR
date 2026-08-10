import { useEffect, useMemo, useState } from 'react'
import { getClinicalTimeline } from '../../services/clinical.service'

const noteSections = [
  ['Chief Complaint', 'chief_complaint'],
  ['Medical / Dental History', 'medical_dental_history'],
  ['Family / Social History', 'family_social_history'],
  ['General Examination', 'general_examination'],
  ['Orofacial Examination', 'orofacial_examination'],
  ['Assessment', 'clinical_findings'],
  ['Diagnosis', 'diagnosis'],
  ['Treatment Planned', 'treatment_planned'],
  ['Treatment Performed', 'treatment_performed'],
  ['Prescription / Materials', 'materials_used'],
  ['Advice', 'next_visit_instructions'],
  ['Attachments / Notes', 'notes'],
]

function formatScope(scope) {
  if (!scope) return 'Not recorded'
  return scope.replace(/_/g, ' ')
}

function renderNoteDetails(event) {
  const meta = event.meta || {}
  const visibleSections = noteSections.filter(([, key]) => String(meta[key] || '').trim())
  const dentist = meta.dentist || meta.other_dentist_name || 'Not recorded'
  const teeth = Array.isArray(event.tooth_number) && event.tooth_number.length ? event.tooth_number.join(', ') : 'Whole mouth'

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-4">
        <div>
          <span className="block font-bold uppercase text-slate-400">Treating dentist</span>
          <span className="mt-1 block font-semibold text-slate-800">{dentist}</span>
        </div>
        <div>
          <span className="block font-bold uppercase text-slate-400">Visit type</span>
          <span className="mt-1 block font-semibold capitalize text-slate-800">{String(meta.note_type || event.title).replace(/_/g, ' ')}</span>
        </div>
        <div>
          <span className="block font-bold uppercase text-slate-400">Scope</span>
          <span className="mt-1 block font-semibold capitalize text-slate-800">{formatScope(meta.treatment_scope)}</span>
        </div>
        <div>
          <span className="block font-bold uppercase text-slate-400">Teeth</span>
          <span className="mt-1 block font-semibold text-slate-800">{teeth}</span>
        </div>
      </div>

      {visibleSections.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {visibleSections.map(([label, key]) => (
            <section key={key} className="rounded-lg border border-slate-100 bg-white p-3">
              <h4 className="text-xs font-bold uppercase text-slate-400">{label}</h4>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{meta[key]}</p>
            </section>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No detailed note fields were recorded.</p>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {meta.anesthesia_given && <span className="rounded bg-cyan-50 px-2 py-1 font-semibold text-cyan-700">Anaesthesia given</span>}
        {meta.anesthesia_type && <span className="rounded bg-cyan-50 px-2 py-1 font-semibold text-cyan-700">{meta.anesthesia_type}</span>}
        <span className={`rounded px-2 py-1 font-semibold ${meta.is_signed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {meta.is_signed ? 'Signed' : 'Unsigned'}
        </span>
      </div>
    </div>
  )
}

export default function ClinicalTimeline({ patient }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filters, setFilters] = useState({ type: '', from: '', to: '', tooth: '' })

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    getClinicalTimeline(patient.id)
      .then(data => active && setEvents(Array.isArray(data) ? data : []))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [patient.id])

  const filtered = useMemo(() => events.filter(event => (
    (!filters.type || event.event_type === filters.type) &&
    (!filters.from || event.date >= filters.from) &&
    (!filters.to || event.date <= filters.to) &&
    (!filters.tooth || String(Array.isArray(event.tooth_number) ? event.tooth_number.join(',') : event.tooth_number || '').includes(filters.tooth))
  )), [events, filters])

  if (loading) return <div className="rounded-xl bg-white p-8 text-slate-500">Loading timeline...</div>

  return (
    <section className="space-y-4">
      <div className="grid gap-2 rounded-xl bg-white p-3 shadow-sm sm:grid-cols-4">
        <select aria-label="Event type" value={filters.type} onChange={event => setFilters({ ...filters, type: event.target.value })} className="rounded border p-2 text-sm">
          <option value="">All events</option>
          <option value="note">Clinical notes</option>
          <option value="image">Images</option>
          <option value="appointment">Appointments</option>
          <option value="recall">Reminders</option>
          <option value="orthodontic">Orthodontics</option>
          <option value="document">Documents</option>
          <option value="task">Tasks</option>
          <option value="communication">Communications</option>
        </select>
        <input aria-label="From date" type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} className="rounded border p-2 text-sm" />
        <input aria-label="To date" type="date" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} className="rounded border p-2 text-sm" />
        <input aria-label="Tooth filter" placeholder="Tooth" value={filters.tooth} onChange={event => setFilters({ ...filters, tooth: event.target.value })} className="rounded border p-2 text-sm" />
      </div>

      {error ? (
        <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">Timeline is temporarily unavailable.</div>
      ) : filtered.length ? (
        <ol className="space-y-3">
          {filtered.map(event => (
            <li key={`${event.event_type}-${event.id}`} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <h3 className="font-bold">{event.title}</h3>
                  {event.subtitle && <p className="mt-1 text-sm text-slate-600">{event.subtitle}</p>}
                </div>
                <time className="text-sm text-slate-500">{event.date}</time>
              </div>
              {event.event_type === 'note' ? renderNoteDetails(event) : null}
              <span className="mt-3 inline-block rounded bg-slate-100 px-2 py-1 text-xs capitalize">{event.event_type}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-xl bg-white p-8 text-center text-slate-500">No timeline events match these filters.</div>
      )}
    </section>
  )
}
