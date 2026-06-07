import { useState } from 'react'

import Input from '../ui/Input'
import Button from '../ui/Button'
import Toast from '../ui/Toast'
import Select from '../ui/Select'

import {
  createClinicalNote,
} from '../../services/clinical.service'

export default function SOAPEditor({
  patient,
}) {
  const [loading, setLoading] = useState(false)

  const [success, setSuccess] =
    useState(false)

  const [error, setError] =
    useState(null)

  const [form, setForm] = useState({
    note_type: 'treatment',
    tooth_number: '',
    chief_complaint: '',
    clinical_findings: '',
    diagnosis: '',
    treatment_performed: '',
    materials_used: '',
    anesthesia_given: false,
    anesthesia_type: '',
    next_visit_instructions: '',
    notes: '',
    note_date: new Date()
      .toISOString()
      .split('T')[0],
  })

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)

      await createClinicalNote({
        patient: patient.id,
        ...form,
      })

      setSuccess(true)

      setTimeout(() => {
        setSuccess(false)
      }, 3000)

      setForm({
        note_type: 'treatment',
        tooth_number: '',
        chief_complaint: '',
        clinical_findings: '',
        diagnosis: '',
        treatment_performed: '',
        materials_used: '',
        anesthesia_given: false,
        anesthesia_type: '',
        next_visit_instructions: '',
        notes: '',
        note_date: new Date()
          .toISOString()
          .split('T')[0],
      })
    } catch (err) {
      console.error(err)

      setError(
        'Failed to save note'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {success && (
        <Toast
          message="Clinical note saved"
        />
      )}

      {error && (
        <Toast
          type="error"
          message={error}
        />
      )}

      <form
        onSubmit={handleSubmit}
        className="
          bg-white
          rounded-2xl
          shadow
          p-6
          space-y-6
        "
      >
        <h2 className="text-xl font-bold">
          SOAP Note
        </h2>

        <Select
          label="Note Type"
          name="note_type"
          value={form.note_type}
          onChange={handleChange}
          options={[
            { value: 'examination', label: 'Examination' },
            { value: 'diagnosis', label: 'Diagnosis' },
            { value: 'treatment', label: 'Treatment' },
            { value: 'follow_up', label: 'Follow Up' },
            { value: 'general', label: 'General' },
          ]}
        />

        <Input
          label="Tooth Number"
          name="tooth_number"
          value={form.tooth_number}
          onChange={handleChange}
        />


        <Input
          label="Chief Complaint"
          name="chief_complaint"
          textarea
          rows={3}
          value={form.chief_complaint}
          onChange={handleChange}
        />

        <Input
          label="Clinical Findings"
          name="clinical_findings"
          textarea
          rows={4}
          value={form.clinical_findings}
          onChange={handleChange}
        />

        <Input
          label="Diagnosis"
          name="diagnosis"
          textarea
          rows={3}
          value={form.diagnosis}
          onChange={handleChange}
        />

        <Input
          label="Treatment Performed"
          name="treatment_performed"
          textarea
          rows={4}
          value={form.treatment_performed}
          onChange={handleChange}
        />

        <Input
          label="Materials Used"
          name="materials_used"
          value={form.materials_used}
          onChange={handleChange}
        />

        <Input
          label="Anesthesia Type"
          name="anesthesia_type"
          value={form.anesthesia_type}
          onChange={handleChange}
        />

        <Input
          label="Next Visit Instructions"
          name="next_visit_instructions"
          textarea
          rows={3}
          value={form.next_visit_instructions}
          onChange={handleChange}
        />

        <Input
          label="Notes"
          name="notes"
          textarea
          rows={4}
          value={form.notes}
          onChange={handleChange}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Saving...'
              : 'Save Clinical Note'}
          </Button>
        </div>
      </form>
    </>
  )
}