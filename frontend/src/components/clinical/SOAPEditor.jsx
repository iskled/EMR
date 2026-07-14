import { useEffect, useState } from 'react'
import Input from '../ui/Input'
import Button from '../ui/Button'
import Toast from '../ui/Toast'
import Select from '../ui/Select'

import TemplateField from './TemplateField'
import DentistSelector from './DentistSelector'
import RecallScheduler from './RecallScheduler'

import {
  createClinicalNote,
  getClinicalTemplates,
} from '../../services/clinical.service'
import { getDentists } from '../../services/appointments.service'

const templateGroups = {
  chief_complaint: [],
  medical_dental_history: [],
  family_social_history: [],
  clinical_findings: [],
  general_examination: [],
  orofacial_examination: [],
  diagnosis: [],
  treatment_planned: [],
  treatment_performed: [],
  materials_used: [],
  next_visit_instructions: [],
}

const initialForm = {
  dentist: '',
  dentist_name: '',
  note_type: 'treatment',
  tooth_numbers: [],
  chief_complaint: '',
  medical_dental_history: '',
  family_social_history: '',
  clinical_findings: '',
  general_examination: '',
  orofacial_examination: '',
  diagnosis: '',
  treatment_planned: '',
  treatment_performed: '',
  materials_used: '',
  anesthesia_type: '',
  next_visit_instructions: '',
  notes: '',
  note_date: new Date().toISOString().split('T')[0],
  schedule_recall: false,
  recall_type: 'preventive',
  recall_interval: 180,
}

export default function SOAPEditor({
  patient,
  selectedTeeth = [],
}) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [dentists, setDentists] = useState([])
  const [templates, setTemplates] = useState(templateGroups)
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    async function loadDentists() {
      try {
        const response = await getDentists()
        const data = response.data

        if (Array.isArray(data)) {
          setDentists(data)
        } else if (Array.isArray(data.results)) {
          setDentists(data.results)
        } else {
          setDentists([])
        }
      } catch (err) {
        console.error(err)
        setDentists([])
      }
    }

    loadDentists()
  }, [])

  useEffect(() => {
    async function loadTemplates() {
      try {
        const templateList = await getClinicalTemplates()
        const grouped = Object.keys(templateGroups).reduce((acc, key) => {
          acc[key] = []
          return acc
        }, {})

        templateList.forEach(template => {
          const type = template.template_type

          if (grouped[type]) {
            grouped[type].push({
              label: template.label,
              content: template.content,
            })
          }
        })

        setTemplates(grouped)
      } catch (err) {
        console.error('Template loading failed:', err)
      }
    }

    loadTemplates()
  }, [])

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      tooth_numbers: selectedTeeth,
    }))
  }, [selectedTeeth])

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function applyTemplate(field, content) {
    setForm(prev => ({
      ...prev,
      [field]: prev[field]
        ? `${prev[field]}\n${content}`
        : content,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)

      if (!form.dentist) {
        setError('Please select a dentist')
        setLoading(false)
        return
      }

      const payload = {
        patient: patient.id,
        dentist: form.dentist,
        note_type: form.note_type,
        tooth_numbers: form.tooth_numbers,
        chief_complaint: form.chief_complaint,
        medical_dental_history: form.medical_dental_history,
        family_social_history: form.family_social_history,
        clinical_findings: form.clinical_findings,
        general_examination: form.general_examination,
        orofacial_examination: form.orofacial_examination,
        diagnosis: form.diagnosis,
        treatment_planned: form.treatment_planned,
        treatment_performed: form.treatment_performed,
        materials_used: form.materials_used,
        anesthesia_type: form.anesthesia_type,
        next_visit_instructions: form.next_visit_instructions,
        notes: form.notes,
        note_date: form.note_date,
      }

      await createClinicalNote(payload)

      setForm({
        ...initialForm,
        dentist: form.dentist,
      })

      setSuccess(true)

      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      console.error(err.response?.data || err)
      setError('Failed to save clinical note')
    } finally {
      setLoading(false)
    }
  }

  const isOrtho =
    patient?.patient_category === 'orthodontic' ||
    patient?.patient_category === 'both'

  return (
    <>
      {success && (
        <Toast message="Clinical note saved" />
      )}

      {error && (
        <Toast type="error" message={error} />
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow p-6 space-y-6"
      >
        <h2 className="text-xl font-bold">
          SOAP Note
        </h2>

        <DentistSelector
          dentists={dentists}
          selectedDentist={form.dentist}
          manualDentist={form.dentist_name}
          onChange={handleChange}
        />

        <Select
          label="Visit Type"
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
          label="Selected Teeth"
          value={form.tooth_numbers.join(', ')}
          readOnly
        />

        <h3 className="font-semibold text-lg">Subjective</h3>

        <TemplateField
          label="Chief Complaint"
          name="chief_complaint"
          value={form.chief_complaint}
          templates={templates.chief_complaint}
          onTemplateSelect={applyTemplate}
          onChange={handleChange}
        />

        <TemplateField
          label="Medical / Dental History"
          name="medical_dental_history"
          value={form.medical_dental_history}
          templates={templates.medical_dental_history}
          onTemplateSelect={applyTemplate}
          onChange={handleChange}
        />

        <TemplateField
          label="Family / Social History"
          name="family_social_history"
          value={form.family_social_history}
          templates={templates.family_social_history}
          onTemplateSelect={applyTemplate}
          onChange={handleChange}
        />

        <h3 className="font-semibold text-lg">Objective</h3>

        <TemplateField
          label="Clinical Findings"
          name="clinical_findings"
          value={form.clinical_findings}
          templates={templates.clinical_findings}
          rows={4}
          onTemplateSelect={applyTemplate}
          onChange={handleChange}
        />

        <TemplateField
          label="General Examination"
          name="general_examination"
          value={form.general_examination}
          templates={templates.general_examination}
          onTemplateSelect={applyTemplate}
          onChange={handleChange}
        />

        <TemplateField
          label="Orofacial Examination"
          name="orofacial_examination"
          value={form.orofacial_examination}
          templates={templates.orofacial_examination}
          onTemplateSelect={applyTemplate}
          onChange={handleChange}
        />

        <h3 className="font-semibold text-lg">Assessment</h3>

        <TemplateField
          label="Diagnosis"
          name="diagnosis"
          value={form.diagnosis}
          templates={templates.diagnosis}
          onTemplateSelect={applyTemplate}
          onChange={handleChange}
        />

        <h3 className="font-semibold text-lg">Plan</h3>

        <TemplateField
          label="Treatment Planned"
          name="treatment_planned"
          value={form.treatment_planned}
          templates={templates.treatment_planned}
          onTemplateSelect={applyTemplate}
          onChange={handleChange}
        />

        <TemplateField
          label="Treatment Performed"
          name="treatment_performed"
          value={form.treatment_performed}
          templates={templates.treatment_performed}
          onTemplateSelect={applyTemplate}
          onChange={handleChange}
        />

        <TemplateField
          label="Materials Used"
          name="materials_used"
          value={form.materials_used}
          templates={templates.materials_used}
          onTemplateSelect={applyTemplate}
          onChange={handleChange}
        />

        <Input
          label="Anesthesia Type"
          name="anesthesia_type"
          value={form.anesthesia_type}
          onChange={handleChange}
        />

        <TemplateField
          label="Next Visit Instructions"
          name="next_visit_instructions"
          value={form.next_visit_instructions}
          templates={templates.next_visit_instructions}
          onTemplateSelect={applyTemplate}
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

        <RecallScheduler
          form={form}
          handleChange={handleChange}
          isOrtho={isOrtho}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Clinical Note'}
          </Button>
        </div>
      </form>
    </>
  )
}
