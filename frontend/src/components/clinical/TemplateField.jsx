import Input from '../ui/Input'
import Select from '../ui/Select'

export default function TemplateField({
  label,
  name,
  value,
  templates = [],
  rows = 3,
  onTemplateSelect,
  onChange
}) {
  return (
    <div className="space-y-2">
      <Select
        label={`${label} Template`}
        value=""
        onChange={(e) => {
          if (e.target.value) {
            onTemplateSelect(name, e.target.value)
            e.target.value = ''
          }
        }}
        options={[
          { value: '', label: 'Select template...' },
          ...templates.map(item => ({
            value: item.content || item.label,
            label: item.label
          }))
        ]}
      />

      <Input
        label={label}
        name={name}
        textarea
        rows={rows}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}