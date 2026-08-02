import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

export default function ReportFilters({ filters, dentists = [], appointmentTypes = [], categories = [], locations = [], suppliers = [], onChange, onReset }) {
  function update(name, value) {
    onChange?.({ ...filters, [name]: value })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <Input label="Start date" type="date" value={filters.start_date} onChange={event => update('start_date', event.target.value)} />
        <Input label="End date" type="date" value={filters.end_date} onChange={event => update('end_date', event.target.value)} />
        <Select label="Dentist" value={filters.dentist} onChange={event => update('dentist', event.target.value)} options={[{ value: '', label: 'All dentists' }, ...dentists.map(item => ({ value: item.id, label: `${item.first_name || ''} ${item.last_name || item.email}`.trim() }))]} />
        <Select label="Status" value={filters.status} onChange={event => update('status', event.target.value)} options={[{ value: '', label: 'Any status' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'no_show', label: 'No Show' }, { value: 'active', label: 'Active' }, { value: 'retention', label: 'Retention' }]} />
        <Select label="Appointment type" value={filters.appointment_type} onChange={event => update('appointment_type', event.target.value)} options={[{ value: '', label: 'All types' }, ...appointmentTypes.map(item => ({ value: item.id, label: item.name }))]} />
        <Select label="Inventory category" value={filters.inventory_category} onChange={event => update('inventory_category', event.target.value)} options={[{ value: '', label: 'All categories' }, ...categories.map(item => ({ value: item.id, label: item.name }))]} />
        <Select label="Inventory location" value={filters.inventory_location} onChange={event => update('inventory_location', event.target.value)} options={[{ value: '', label: 'All locations' }, ...locations.map(item => ({ value: item.id, label: item.name }))]} />
        <Select label="Supplier" value={filters.supplier} onChange={event => update('supplier', event.target.value)} options={[{ value: '', label: 'All suppliers' }, ...suppliers.map(item => ({ value: item.id, label: item.name }))]} />
        <Select label="Staff role" value={filters.staff_role} onChange={event => update('staff_role', event.target.value)} options={[{ value: '', label: 'Any role' }, { value: 'admin', label: 'Admin' }, { value: 'dentist', label: 'Dentist' }, { value: 'assistant', label: 'Assistant' }, { value: 'receptionist', label: 'Receptionist' }]} />
        <Input label="Orthodontic stage" value={filters.orthodontic_stage} onChange={event => update('orthodontic_stage', event.target.value)} />
      </div>
      <div className="mt-4 flex justify-end"><Button type="button" onClick={onReset} className="bg-gray-700 hover:bg-gray-800">Reset Filters</Button></div>
    </div>
  )
}
