import { useEffect, useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { createInventoryItem, updateInventoryItem } from '../../services/inventory.service'

const empty = {
  name: '', sku: '', category: '', unit_of_measure: 'unit',
  description: '', default_supplier: '', storage_location: '', reorder_level: 0,
  target_stock_level: 0, unit_cost: 0, chargeable_cost: '', is_active: true,
}

export default function InventoryItemModal({ open, item, categories = [], suppliers = [], locations = [], onClose, onSaved }) {
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(item ? { ...empty, ...item } : empty)
      setError('')
    }
  }, [open, item])

  if (!open) return null

  function update(name, value) {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.name || (!item && (!form.category || !form.default_supplier))) {
      setError('Name, category, and default supplier are required.')
      return
    }
    const { item_type: legacyItemType, ...visibleForm } = form
    const payload = {
      ...visibleForm,
      category: form.category || null,
      default_supplier: form.default_supplier || null,
      storage_location: form.storage_location || null,
      reorder_level: Number(form.reorder_level || 0),
      target_stock_level: Number(form.target_stock_level || 0),
      unit_cost: Number(form.unit_cost || 0),
      chargeable_cost: form.chargeable_cost === '' ? null : Number(form.chargeable_cost),
    }
    try {
      setSaving(true)
      if (item?.id) await updateInventoryItem(item.id, payload)
      else await createInventoryItem(payload)
      await onSaved?.()
      onClose?.()
    } catch {
      setError('Unable to save inventory item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4">
      <div className="mx-auto max-h-[92vh] max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-2xl">
        <div className="mb-5 flex justify-between"><h2 className="text-xl font-bold">{item ? 'Edit Inventory Item' : 'New Inventory Item'}</h2><button onClick={onClose}>x</button></div>
        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Input label="Name" value={form.name} onChange={e => update('name', e.target.value)} required />
            <Input label="SKU/code" value={item ? form.sku : 'Generated automatically on save'} onChange={e => update('sku', e.target.value)} disabled={!item} />
            <Select label="Category" value={form.category || ''} onChange={e => update('category', e.target.value)} options={[{ value: '', label: 'Select category' }, ...categories.map(x => ({ value: x.id, label: x.name }))]} required={!item} />
            <Select label="Default supplier" value={form.default_supplier || ''} onChange={e => update('default_supplier', e.target.value)} options={[{ value: '', label: 'Select supplier' }, ...suppliers.map(x => ({ value: x.id, label: x.name }))]} required={!item} />
            <Select label="Storage location" value={form.storage_location || ''} onChange={e => update('storage_location', e.target.value)} options={[{ value: '', label: 'No location' }, ...locations.map(x => ({ value: x.id, label: x.name }))]} />
            <Input label="Unit of measure" value={form.unit_of_measure} onChange={e => update('unit_of_measure', e.target.value)} />
            <Input label="Reorder level" type="number" value={form.reorder_level} onChange={e => update('reorder_level', e.target.value)} />
            <Input label="Target stock level" type="number" value={form.target_stock_level} onChange={e => update('target_stock_level', e.target.value)} />
            <Input label="Unit cost" type="number" step="0.01" value={form.unit_cost} onChange={e => update('unit_cost', e.target.value)} />
            <Input label="Chargeable cost" type="number" step="0.01" value={form.chargeable_cost || ''} onChange={e => update('chargeable_cost', e.target.value)} />
            <Select label="Status" value={String(form.is_active)} onChange={e => update('is_active', e.target.value === 'true')} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
          </div>
          <Input label="Description" textarea rows={3} value={form.description} onChange={e => update('description', e.target.value)} />
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" onClick={onClose} className="bg-gray-700 hover:bg-gray-800">Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Item'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
