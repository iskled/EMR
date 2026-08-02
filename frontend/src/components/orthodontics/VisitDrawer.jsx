import { useEffect, useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import {
  MEASUREMENT_FIELDS,
  APPLIANCE_FIELDS,
  VISIT_TYPE_OPTIONS,
  createOrthodonticVisit,
  updateOrthodonticVisit,
} from '../../services/orthodontics.service'

const emptyVisit = {
  dentist: '',
  visit_date: '',
  visit_type: 'adjustment',
  procedures: [],
  procedures_performed: '',
  measurements: {},
  appliance_changes: {},
  upper_wire: '',
  lower_wire: '',
  compliance: '',
  notes: '',
  clinical_notes: '',
  next_review_days: 42,
  next_review_date: '',
}

export default function VisitDrawer({ open, orthoCase, visit, dentists = [], onClose, onSaved }) {
  const [form, setForm] = useState(emptyVisit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(visit ? { ...emptyVisit, ...visit } : emptyVisit)
  }, [open, visit])

  if (!open || !orthoCase) return null

  function update(name, value) {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function updateNested(group, name, value) {
    setForm(prev => ({ ...prev, [group]: { ...(prev[group] || {}), [name]: value } }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.dentist || !form.visit_date) {
      setError('Treating dentist and visit date are required.')
      return
    }
    try {
      setSaving(true)
      const payload = {
        ...form,
        ortho_case: orthoCase.id,
        procedures: form.procedures_performed ? form.procedures_performed.split('\n').filter(Boolean) : [],
        next_review_days: Number(form.next_review_days || 42),
      }
      if (visit?.id) await updateOrthodonticVisit(visit.id, payload)
      else await createOrthodonticVisit(payload)
      await onSaved?.()
      onClose?.()
    } catch {
      setError('Unable to save orthodontic visit.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{visit ? 'Edit Orthodontic Visit' : 'Record Orthodontic Visit'}</h2>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 hover:bg-gray-100">x</button>
        </div>
        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>}
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Treating dentist" required value={form.dentist || ''} onChange={event => update('dentist', event.target.value)} options={[{ value: '', label: 'Select dentist' }, ...dentists.map(dentist => ({ value: dentist.id, label: `${dentist.first_name || ''} ${dentist.last_name || dentist.email}`.trim() }))]} />
            <Input label="Visit date" required type="date" value={form.visit_date} onChange={event => update('visit_date', event.target.value)} />
            <Select label="Visit type" value={form.visit_type} onChange={event => update('visit_type', event.target.value)} options={VISIT_TYPE_OPTIONS} />
            <Select label="Compliance" value={form.compliance || ''} onChange={event => update('compliance', event.target.value)} options={[{ value: '', label: 'Not recorded' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }]} />
            <Input label="Upper wire" value={form.upper_wire || ''} onChange={event => update('upper_wire', event.target.value)} />
            <Input label="Lower wire" value={form.lower_wire || ''} onChange={event => update('lower_wire', event.target.value)} />
            <Input label="Next review date" type="date" value={form.next_review_date || ''} onChange={event => update('next_review_date', event.target.value)} />
            <Input label="Next review days" type="number" value={form.next_review_days} onChange={event => update('next_review_days', event.target.value)} />
          </div>
          <Input label="Procedures performed" textarea rows={4} value={form.procedures_performed || ''} onChange={event => update('procedures_performed', event.target.value)} />
          <Input label="Clinical notes" textarea rows={4} value={form.clinical_notes || ''} onChange={event => update('clinical_notes', event.target.value)} />
          <Input label="Additional notes" textarea rows={3} value={form.notes || ''} onChange={event => update('notes', event.target.value)} />
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold">Measurements</h3>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {MEASUREMENT_FIELDS.map(field => <Input key={field} label={field.replace(/_/g, ' ')} value={form.measurements?.[field] || ''} onChange={event => updateNested('measurements', field, event.target.value)} />)}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold">Appliance Changes</h3>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {APPLIANCE_FIELDS.map(field => <Input key={field} label={field.replace(/_/g, ' ')} value={form.appliance_changes?.[field] || ''} onChange={event => updateNested('appliance_changes', field, event.target.value)} />)}
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button type="button" onClick={onClose} className="bg-gray-700 hover:bg-gray-800">Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Visit'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
