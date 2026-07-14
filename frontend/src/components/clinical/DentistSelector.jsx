import Input from '../ui/Input'
import Select from '../ui/Select'

export default function DentistSelector({
  dentists = [],
  selectedDentist = '',
  manualDentist = '',
  onChange
}) {
  const safeDentists = Array.isArray(dentists)
    ? dentists.filter(Boolean)
    : []

  const dentistOptions = [
    { value: '', label: 'Select dentist' },
    ...safeDentists.map((d) => {
      const fullName =
        `${d?.first_name || ''} ${d?.last_name || ''}`.trim()

      return {
        value: d?.id || '',
        label:
          d?.name ||
          fullName ||
          d?.email ||
          'Unknown Dentist'
      }
    })
  ]

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Select
        label="Dentist"
        name="dentist"
        value={selectedDentist}
        onChange={onChange}
        options={dentistOptions}
      />

      <Input
        label="Other Dentist"
        name="dentist_name"
        value={manualDentist}
        onChange={onChange}
        placeholder="Type dentist name"
        disabled={!!selectedDentist}
      />
    </div>
  )
}