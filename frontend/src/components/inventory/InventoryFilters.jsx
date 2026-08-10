import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

export default function InventoryFilters({ filters, categories = [], locations = [], onChange, onReset }) {
  function update(name, value) {
    onChange?.({ ...filters, [name]: value })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Input label="Search" value={filters.search} onChange={event => update('search', event.target.value)} placeholder="Name, SKU, description" />
        <Select label="Category" value={filters.category} onChange={event => update('category', event.target.value)} options={[{ value: '', label: 'All categories' }, ...categories.map(item => ({ value: item.id, label: item.name }))]} />
        <Select label="Location" value={filters.storage_location} onChange={event => update('storage_location', event.target.value)} options={[{ value: '', label: 'All locations' }, ...locations.map(item => ({ value: item.id, label: item.name }))]} />
        <Select label="Status" value={filters.is_active} onChange={event => update('is_active', event.target.value)} options={[{ value: '', label: 'Any status' }, { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button" onClick={onReset} className="bg-gray-700 hover:bg-gray-800">Reset Filters</Button>
      </div>
    </div>
  )
}
