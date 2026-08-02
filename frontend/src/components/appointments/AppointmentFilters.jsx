import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { STATUS_OPTIONS } from '../../services/appointments.service'

export default function AppointmentFilters({
  filters,
  dentists = [],
  appointmentTypes = [],
  onChange,
  onReset,
}) {
  const dentistOptions = [
    { value: '', label: 'All dentists' },
    ...dentists.map(dentist => ({
      value: dentist.id,
      label:
        dentist.first_name || dentist.last_name
          ? `${dentist.first_name || ''} ${dentist.last_name || ''}`.trim()
          : dentist.email,
    })),
  ]

  const typeOptions = [
    { value: '', label: 'All appointment types' },
    ...appointmentTypes.map(type => ({
      value: type.id,
      label: type.name,
    })),
  ]

  const statusOptions = [
    { value: '', label: 'All statuses' },
    ...STATUS_OPTIONS,
  ]

  function update(name, value) {
    onChange?.({
      ...filters,
      [name]: value,
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <Input
          label="Patient search"
          value={filters.search}
          onChange={event => update('search', event.target.value)}
          placeholder="Name, code, complaint"
        />
        <Select
          label="Dentist"
          value={filters.dentist}
          onChange={event => update('dentist', event.target.value)}
          options={dentistOptions}
        />
        <Select
          label="Appointment type"
          value={filters.appointment_type}
          onChange={event => update('appointment_type', event.target.value)}
          options={typeOptions}
        />
        <Select
          label="Status"
          value={filters.status}
          onChange={event => update('status', event.target.value)}
          options={statusOptions}
        />
        <Input
          label="Date"
          type="date"
          value={filters.scheduled_date}
          onChange={event => update('scheduled_date', event.target.value)}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          onClick={onReset}
          className="bg-gray-700 hover:bg-gray-800"
        >
          Reset filters
        </Button>
      </div>
    </div>
  )
}
