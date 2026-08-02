import { useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { createPurchaseOrder } from '../../services/inventory.service'

export default function PurchaseOrderModal({ open, suppliers = [], items = [], onClose, onSaved }) {
  const [form, setForm] = useState({ supplier: '', reference: '', expected_delivery_date: '', notes: '', item: '', quantity_ordered: 1, unit_cost: 0 })
  const [error, setError] = useState('')
  if (!open) return null
  async function submit(event) {
    event.preventDefault()
    try {
      await createPurchaseOrder({
        supplier: form.supplier,
        reference: form.reference,
        expected_delivery_date: form.expected_delivery_date || null,
        notes: form.notes,
        items: [{ item: form.item, quantity_ordered: Number(form.quantity_ordered), unit_cost: Number(form.unit_cost || 0) }],
      })
      await onSaved?.(); onClose?.()
    } catch { setError('Unable to create purchase order.') }
  }
  return <div className="fixed inset-0 z-50 bg-black/50 p-4"><div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-2xl">
    <div className="mb-4 flex justify-between"><h2 className="text-xl font-bold">New Purchase Order</h2><button onClick={onClose}>x</button></div>
    {error && <p className="mb-3 rounded bg-red-50 p-3 text-red-800">{error}</p>}
    <form onSubmit={submit} className="space-y-4">
      <Select label="Supplier" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} options={[{ value: '', label: 'Select supplier' }, ...suppliers.map(x => ({ value: x.id, label: x.name }))]} />
      <Input label="Reference" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
      <Input label="Expected delivery" type="date" value={form.expected_delivery_date} onChange={e => setForm({ ...form, expected_delivery_date: e.target.value })} />
      <Select label="Item" value={form.item} onChange={e => {
        const item = items.find(x => String(x.id) === String(e.target.value))
        setForm({ ...form, item: e.target.value, unit_cost: item?.unit_cost || 0 })
      }} options={[{ value: '', label: 'Select item' }, ...items.map(x => ({ value: x.id, label: `${x.name} (${x.sku})` }))]} />
      <Input label="Quantity" type="number" value={form.quantity_ordered} onChange={e => setForm({ ...form, quantity_ordered: e.target.value })} />
      <Input label="Unit cost" type="number" step="0.01" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} />
      <Input label="Notes" textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      <div className="flex justify-end gap-3"><Button type="button" onClick={onClose} className="bg-gray-700 hover:bg-gray-800">Cancel</Button><Button type="submit">Create PO</Button></div>
    </form>
  </div></div>
}
