import { useEffect, useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { receiveStock } from '../../services/inventory.service'

export default function StockReceiptModal({ open, item, suppliers = [], locations = [], onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) setForm({ item: item?.id || '', batch_number: '', quantity: 1, supplier: item?.default_supplier || '', storage_location: item?.storage_location || '', purchase_cost: item?.unit_cost || 0, expiry_date: '', receipt_reference: '', notes: '' })
  }, [open, item])

  if (!open) return null
  async function submit(event) {
    event.preventDefault()
    try {
      await receiveStock({ ...form, supplier: form.supplier || null, storage_location: form.storage_location || null, expiry_date: form.expiry_date || null })
      await onSaved?.(); onClose?.()
    } catch (e) { setError('Unable to receive stock.') }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4"><div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-2xl">
      <div className="mb-4 flex justify-between"><h2 className="text-xl font-bold">Receive Stock</h2><button onClick={onClose}>x</button></div>
      {error && <p className="mb-3 rounded bg-red-50 p-3 text-red-800">{error}</p>}
      <form onSubmit={submit} className="space-y-4">
        <Input label="Batch/lot number" value={form.batch_number || ''} onChange={e => setForm({ ...form, batch_number: e.target.value })} required />
        <Input label="Quantity received" type="number" value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
        <Select label="Supplier" value={form.supplier || ''} onChange={e => setForm({ ...form, supplier: e.target.value })} options={[{ value: '', label: 'No supplier' }, ...suppliers.map(x => ({ value: x.id, label: x.name }))]} />
        <Select label="Location" value={form.storage_location || ''} onChange={e => setForm({ ...form, storage_location: e.target.value })} options={[{ value: '', label: 'No location' }, ...locations.map(x => ({ value: x.id, label: x.name }))]} />
        <Input label="Expiry date" type="date" value={form.expiry_date || ''} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
        <Input label="Purchase cost" type="number" step="0.01" value={form.purchase_cost || ''} onChange={e => setForm({ ...form, purchase_cost: e.target.value })} />
        <Input label="Delivery note/reference" value={form.receipt_reference || ''} onChange={e => setForm({ ...form, receipt_reference: e.target.value })} />
        <Input label="Notes" textarea rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
        <div className="flex justify-end gap-3"><Button type="button" onClick={onClose} className="bg-gray-700 hover:bg-gray-800">Cancel</Button><Button type="submit">Receive</Button></div>
      </form>
    </div></div>
  )
}
