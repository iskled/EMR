import { useEffect, useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import {
  APPLIANCE_FIELDS,
  CASE_STATUS_OPTIONS,
  MEASUREMENT_FIELDS,
  parseJsonField,
  updateOrthodonticCase,
  createOrthodonticCase,
} from '../../services/orthodontics.service'

const defaultMilestones = [
  'Initial Consultation',
  'Diagnostic Records',
  'Bonding',
  'Adjustment Visits',
  'Wire Changes',
  'Elastic Reviews',
  'Appliance Repairs',
  'Debond',
  'Retention Review',
  'Completed',
].map(label => ({ label, completed: false }))

const emptyForm = {
  patient: '',
  diagnosis: '',
  malocclusion_classification: '',
  chief_complaint: '',
  treatment_objectives: '',
  treatment_plan: '',
  estimated_duration_months: 18,
  start_date: '',
  estimated_completion: '',
  status: 'active',
  stage: 'Initial Consultation',
  appliance_type: '',
  clinical_notes: '',
  measurements: {},
  appliances: {},
  milestones: defaultMilestones,
}

export default function CaseForm({ open, orthoCase, patients = [], onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors([])
    setForm(orthoCase ? { ...emptyForm, ...orthoCase } : emptyForm)
  }, [open, orthoCase])

  if (!open) return null

  function update(name, value) {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function updateNested(group, name, value) {
    setForm(prev => ({
      ...prev,
      [group]: {
        ...(prev[group] || {}),
        [name]: value,
      },
    }))
  }

  function toggleMilestone(index) {
    setForm(prev => ({
      ...prev,
      milestones: prev.milestones.map((item, itemIndex) =>
        itemIndex === index ? { ...item, completed: !item.completed } : item
      ),
    }))
  }

  async function submit(event) {
    event.preventDefault()
    const nextErrors = []
    if (!form.patient) nextErrors.push('Patient is required.')
    if (!form.start_date) nextErrors.push('Treatment start date is required.')
    if (!form.diagnosis.trim()) nextErrors.push('Diagnosis is required.')
    if (!form.treatment_plan.trim()) nextErrors.push('Treatment plan is required.')
    setErrors(nextErrors)
    if (nextErrors.length || loading) return

    const payload = {
      ...form,
      estimated_duration_months: Number(form.estimated_duration_months || 0),
      measurements: parseJsonField(form.measurements, {}),
      appliances: parseJsonField(form.appliances, {}),
      milestones: parseJsonField(form.milestones, defaultMilestones),
    }

    try {
      setLoading(true)
      if (orthoCase?.id) {
        await updateOrthodonticCase(orthoCase.id, payload)
      } else {
        await createOrthodonticCase(payload)
      }
      await onSaved?.()
      onClose?.()
    } catch (error) {
      const data = error?.response?.data
      setErrors(data ? Object.values(data).flat().map(String) : ['Unable to save orthodontic case.'])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4">
      <div className="mx-auto max-h-[92vh] max-w-5xl overflow-y-auto rounded-lg bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{orthoCase ? 'Edit Orthodontic Case' : 'Create Orthodontic Case'}</h2>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 hover:bg-gray-100">x</button>
        </div>

        {errors.length > 0 && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {errors.map(error => <p key={error}>{error}</p>)}
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Select label="Patient" required value={form.patient} onChange={event => update('patient', event.target.value)} options={[{ value: '', label: 'Select patient' }, ...patients.map(patient => ({ value: patient.id, label: `${patient.full_name} (${patient.patient_code})` }))]} />
            <Select label="Status" value={form.status} onChange={event => update('status', event.target.value)} options={CASE_STATUS_OPTIONS} />
            <Input label="Current stage" value={form.stage} onChange={event => update('stage', event.target.value)} />
            <Input label="Start date" type="date" required value={form.start_date} onChange={event => update('start_date', event.target.value)} />
            <Input label="Estimated completion" type="date" value={form.estimated_completion || ''} onChange={event => update('estimated_completion', event.target.value)} />
            <Input label="Estimated duration months" type="number" min="1" value={form.estimated_duration_months} onChange={event => update('estimated_duration_months', event.target.value)} />
            <Input label="Malocclusion classification" value={form.malocclusion_classification} onChange={event => update('malocclusion_classification', event.target.value)} />
            <Input label="Primary appliance type" value={form.appliance_type} onChange={event => update('appliance_type', event.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Diagnosis" textarea rows={3} value={form.diagnosis} onChange={event => update('diagnosis', event.target.value)} />
            <Input label="Chief complaint" textarea rows={3} value={form.chief_complaint} onChange={event => update('chief_complaint', event.target.value)} />
            <Input label="Treatment objectives" textarea rows={3} value={form.treatment_objectives} onChange={event => update('treatment_objectives', event.target.value)} />
            <Input label="Treatment plan" textarea rows={3} value={form.treatment_plan} onChange={event => update('treatment_plan', event.target.value)} />
            <Input label="Clinical notes" textarea rows={3} value={form.clinical_notes} onChange={event => update('clinical_notes', event.target.value)} />
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold">Clinical Measurements</h3>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {MEASUREMENT_FIELDS.map(field => (
                <Input key={field} label={field.replace(/_/g, ' ')} value={form.measurements?.[field] || ''} onChange={event => updateNested('measurements', field, event.target.value)} />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold">Appliances</h3>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {APPLIANCE_FIELDS.map(field => (
                <Input key={field} label={field.replace(/_/g, ' ')} value={form.appliances?.[field] || ''} onChange={event => updateNested('appliances', field, event.target.value)} />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold">Treatment Milestones</h3>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              {form.milestones.map((milestone, index) => (
                <label key={`${milestone.label}-${index}`} className="flex items-center gap-2 rounded border border-gray-200 p-2">
                  <input type="checkbox" checked={Boolean(milestone.completed)} onChange={() => toggleMilestone(index)} />
                  <span>{milestone.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button type="button" onClick={onClose} className="bg-gray-700 hover:bg-gray-800">Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Case'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
