import { useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { adjustStock, transferStock } from '../../services/inventory.service'

export default function StockAdjustmentModal({ open, item, batches = [], locations = [], onClose, onSaved }) {
  const [mode, setMode] = useState('adjustment')
  const [form, setForm] = useState({ batch: '', quantity_delta: 0, quantity: 1, adjustment_type: 'adjustment', location: '', to_location: '', reason: '' })
  const [error, setError] = useState('')
  if (!open) return null
  async function submit(event) {
    event.preventDefault()
    try {
      if (mode === 'transfer') await transferStock({ batch: form.batch, quantity: form.quantity, to_location: form.to_location, reason: form.reason })
      else await adjustStock({ batch: form.batch, quantity_delta: form.quantity_delta, adjustment_type: form.adjustment_type, location: form.location || null, reason: form.reason })
      await onSaved?.(); onClose?.()
    } catch { setError('Unable to complete adjustment. Admin permission and reason may be required.') }
  }
  const itemBatches = batches.filter(b => String(b.item) === String(item?.id))
  return <div className="fixed inset-0 z-50 bg-black/50 p-4"><div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-2xl">
    <div className="mb-4 flex justify-between"><h2 className="text-xl font-bold">Stock Adjustment / Transfer</h2><button onClick={onClose}>x</button></div>
    {error && <p className="mb-3 rounded bg-red-50 p-3 text-red-800">{error}</p>}
    <form onSubmit={submit} className="space-y-4">
      <Select label="Mode" value={mode} onChange={e => setMode(e.target.value)} options={[{ value: 'adjustment', label: 'Adjustment' }, { value: 'transfer', label: 'Transfer' }]} />
      <Select label="Batch" value={form.batch} onChange={e => setForm({ ...form, batch: e.target.value })} options={[{ value: '', label: 'Select batch' }, ...itemBatches.map(b => ({ value: b.id, label: `${b.batch_number} (${b.quantity_remaining})` }))]} />
      {mode === 'transfer' ? <>
        <Input label="Quantity to transfer" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
        <Select label="To location" value={form.to_location} onChange={e => setForm({ ...form, to_location: e.target.value })} options={[{ value: '', label: 'Select location' }, ...locations.map(x => ({ value: x.id, label: x.name }))]} />
      </> : <>
        <Select label="Adjustment type" value={form.adjustment_type} onChange={e => setForm({ ...form, adjustment_type: e.target.value })} options={[{ value: 'adjustment', label: 'Count correction' }, { value: 'return_supplier', label: 'Return to supplier' }, { value: 'transfer_out', label: 'Damage/Loss/Expiry removal' }]} />
        <Input label="Quantity delta" type="number" value={form.quantity_delta} onChange={e => setForm({ ...form, quantity_delta: e.target.value })} />
      </>}
      <Input label="Reason" textarea rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required />
      <div className="flex justify-end gap-3"><Button type="button" onClick={onClose} className="bg-gray-700 hover:bg-gray-800">Cancel</Button><Button type="submit">Save</Button></div>
    </form>
  </div></div>
}
