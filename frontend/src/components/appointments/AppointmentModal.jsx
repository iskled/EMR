import { useEffect, useMemo, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import AvailableSlots from './AvailableSlots'
import AppointmentConflictDialog from './AppointmentConflictDialog'
import {
  createAppointment,
  getAvailableSlots,
  scheduleWaitingListEntry,
  STATUS_OPTIONS,
  updateAppointment,
} from '../../services/appointments.service'

const emptyForm = {
  patient: '',
  dentist: '',
  appointment_type: '',
  scheduled_date: '',
  start_time: '',
  duration_minutes: 30,
  status: 'scheduled',
  chief_complaint: '',
  pre_appointment_notes: '',
}

function addMinutes(time, minutes) {
  if (!time) return ''
  const [hours, mins] = time.split(':').map(Number)
  const date = new Date(2000, 0, 1, hours, mins)
  date.setMinutes(date.getMinutes() + Number(minutes || 0))
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function normalizeErrors(error) {
  const data = error?.response?.data
  if (!data) return ['Unable to save appointment.']
  if (typeof data === 'string') return [data]
  if (Array.isArray(data)) return data.map(String)

  return Object.entries(data).flatMap(([field, value]) => {
    if (Array.isArray(value)) {
      return value.map(item => `${field}: ${item}`)
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).flat().map(item => `${field}: ${item}`)
    }
    return `${field}: ${value}`
  })
}

export default function AppointmentModal({
  isOpen,
  onClose,
  onSaved,
  appointment,
  patients = [],
  dentists = [],
  appointmentTypes = [],
  initialDate = '',
  initialTime = '',
  initialPatient = '',
  waitingEntry = null,
  reminderId = '',
}) {
  const [form, setForm] = useState(emptyForm)
  const [patientSearch, setPatientSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [slotLoading, setSlotLoading] = useState(false)
  const [slots, setSlots] = useState(null)
  const [errors, setErrors] = useState([])

  const isEditing = Boolean(appointment?.id)
  const isWaitingListSchedule = Boolean(waitingEntry?.id)
  const endTime = addMinutes(form.start_time, form.duration_minutes)

  useEffect(() => {
    if (!isOpen) return

    const nextForm = appointment
      ? {
          patient: appointment.patient || '',
          dentist: appointment.dentist || '',
          appointment_type: appointment.appointment_type || '',
          scheduled_date: appointment.scheduled_date || initialDate || '',
          start_time: appointment.start_time || initialTime || '',
          duration_minutes: appointment.duration_minutes || 30,
          status: appointment.status || 'scheduled',
          chief_complaint: appointment.chief_complaint || '',
          pre_appointment_notes: appointment.pre_appointment_notes || '',
        }
      : {
          ...emptyForm,
          patient: waitingEntry?.patient || initialPatient || '',
          dentist: waitingEntry?.preferred_dentist || '',
          appointment_type: waitingEntry?.appointment_type || '',
          scheduled_date: initialDate || '',
          start_time: initialTime || '',
          duration_minutes:
            appointmentTypes.find(type => String(type.id) === String(waitingEntry?.appointment_type))
              ?.default_duration || 30,
          chief_complaint: waitingEntry?.notes || '',
        }

    setForm(nextForm)
    setPatientSearch('')
    setSlots(null)
    setErrors([])
  }, [appointment, appointmentTypes, initialDate, initialTime, initialPatient, isOpen, waitingEntry])

  useEffect(() => {
    const selectedType = appointmentTypes.find(
      type => String(type.id) === String(form.appointment_type)
    )

    if (!isEditing && selectedType && Number(form.duration_minutes) === 30) {
      setForm(prev => ({
        ...prev,
        duration_minutes: selectedType.default_duration || 30,
      }))
    }
  }, [form.appointment_type])

  useEffect(() => {
    if (!form.dentist || !form.scheduled_date || !form.duration_minutes) {
      setSlots(null)
      return
    }

    let ignore = false

    async function loadSlots() {
      try {
        setSlotLoading(true)
        const data = await getAvailableSlots({
          dentist: form.dentist,
          date: form.scheduled_date,
          duration: form.duration_minutes,
        })
        if (!ignore) setSlots(data.slots || [])
      } catch (error) {
        if (!ignore) setSlots([])
      } finally {
        if (!ignore) setSlotLoading(false)
      }
    }

    loadSlots()

    return () => {
      ignore = true
    }
  }, [form.dentist, form.scheduled_date, form.duration_minutes])

  const patientOptions = useMemo(() => {
    const term = patientSearch.toLowerCase().trim()
    const filtered = patients
      .filter(patient => {
        if (!term) return true
        return `${patient.full_name} ${patient.patient_code} ${patient.phone_primary}`
          .toLowerCase()
          .includes(term)
      })
      .slice(0, 30)

    return [
      { value: '', label: 'Select patient' },
      ...filtered.map(patient => ({
        value: patient.id,
        label: `${patient.full_name} (${patient.patient_code})`,
      })),
    ]
  }, [patients, patientSearch])

  const dentistOptions = [
    { value: '', label: 'Select dentist' },
    ...dentists.map(dentist => ({
      value: dentist.id,
      label:
        dentist.first_name || dentist.last_name
          ? `${dentist.first_name || ''} ${dentist.last_name || ''}`.trim()
          : dentist.email,
    })),
  ]

  const typeOptions = [
    { value: '', label: 'Select appointment type' },
    ...appointmentTypes.map(type => ({
      value: type.id,
      label: `${type.name} (${type.default_duration} min)`,
    })),
  ]

  function update(name, value) {
    setForm(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  function validate() {
    const nextErrors = []
    if (!form.patient) nextErrors.push('Patient is required.')
    if (!form.dentist) nextErrors.push('Dentist is required.')
    if (!form.appointment_type) nextErrors.push('Appointment type is required.')
    if (!form.scheduled_date) nextErrors.push('Scheduled date is required.')
    if (!form.start_time) nextErrors.push('Start time is required.')
    if (!form.duration_minutes || Number(form.duration_minutes) < 15) {
      nextErrors.push('Duration must be at least 15 minutes.')
    }
    if (form.status === 'cancelled') {
      nextErrors.push('Use the details drawer to cancel so a cancellation reason is captured.')
    }
    setErrors(nextErrors)
    return nextErrors.length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading || !validate()) return

    const payload = {
      patient: form.patient,
      dentist: form.dentist,
      appointment_type: form.appointment_type,
      scheduled_date: form.scheduled_date,
      start_time: form.start_time,
      end_time: endTime,
      duration_minutes: Number(form.duration_minutes),
      status: form.status,
      chief_complaint: form.chief_complaint,
      pre_appointment_notes: form.pre_appointment_notes,
      ...(reminderId ? { reminder: reminderId } : {}),
    }

    try {
      setLoading(true)
      setErrors([])
      let saved

      if (isWaitingListSchedule) {
        saved = await scheduleWaitingListEntry(waitingEntry.id, payload)
      } else if (isEditing) {
        saved = await updateAppointment(appointment.id, payload)
      } else {
        saved = await createAppointment(payload)
      }

      await onSaved?.(saved)
      onClose?.()
    } catch (error) {
      setErrors(normalizeErrors(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : onClose}
      title={
        isWaitingListSchedule
          ? 'Schedule Waiting List Entry'
          : isEditing
            ? 'Edit Appointment'
            : 'New Appointment'
      }
    >
      <form onSubmit={handleSubmit} className="max-h-[78vh] space-y-5 overflow-y-auto pr-2">
        <AppointmentConflictDialog errors={errors} />

        {isWaitingListSchedule && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            Scheduling {waitingEntry.patient_name} from the waiting list.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Search patient"
            value={patientSearch}
            onChange={event => setPatientSearch(event.target.value)}
            placeholder="Name, code, or phone"
            disabled={isWaitingListSchedule}
          />
          <Select
            label="Patient"
            required
            value={form.patient}
            onChange={event => update('patient', event.target.value)}
            options={patientOptions}
            disabled={isWaitingListSchedule}
          />
          <Select
            label="Dentist"
            required
            value={form.dentist}
            onChange={event => update('dentist', event.target.value)}
            options={dentistOptions}
          />
          <Select
            label="Appointment type"
            required
            value={form.appointment_type}
            onChange={event => update('appointment_type', event.target.value)}
            options={typeOptions}
          />
          <Input
            label="Scheduled date"
            required
            type="date"
            value={form.scheduled_date}
            onChange={event => update('scheduled_date', event.target.value)}
          />
          <Input
            label="Start time"
            required
            type="time"
            value={form.start_time}
            onChange={event => update('start_time', event.target.value)}
          />
          <Select
            label="Duration"
            value={form.duration_minutes}
            onChange={event => update('duration_minutes', Number(event.target.value))}
            options={[
              { value: 15, label: '15 minutes' },
              { value: 30, label: '30 minutes' },
              { value: 45, label: '45 minutes' },
              { value: 60, label: '60 minutes' },
              { value: 90, label: '90 minutes' },
              { value: 120, label: '120 minutes' },
            ]}
          />
          <Input
            label="Computed end time"
            value={endTime}
            disabled
            readOnly
          />
          <Select
            label="Status"
            value={form.status}
            onChange={event => update('status', event.target.value)}
            options={STATUS_OPTIONS.filter(option => option.value !== 'cancelled')}
          />
        </div>

        <AvailableSlots
          slots={slots}
          loading={slotLoading}
          selectedStart={form.start_time}
          onSelect={slot => update('start_time', slot.start)}
        />

        <Input
          label="Chief complaint"
          textarea
          rows={3}
          value={form.chief_complaint}
          onChange={event => update('chief_complaint', event.target.value)}
          placeholder="Patient concern or visit reason"
        />

        <Input
          label="Pre-appointment notes"
          textarea
          rows={3}
          value={form.pre_appointment_notes}
          onChange={event => update('pre_appointment_notes', event.target.value)}
          placeholder="Preparation notes, reminders, or clinical context"
        />

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-gray-200 bg-white pt-4">
          <Button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="bg-gray-700 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Appointment'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
