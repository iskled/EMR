import { useEffect, useMemo, useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { bulkIssueStock } from '../../services/inventory.service'
import InventoryItemSearchSelect, { itemSummary } from './InventoryItemSearchSelect'
import PatientSearchSelect, { patientSummary } from './PatientSearchSelect'

function displayPatientName(patient) {
  return patient?.full_name || `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim()
}

function decimalValue(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function StockUsageModal({
  open,
  item,
  initialPatient = null,
  patientLocked = false,
  onClose,
  onSaved,
}) {
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [usageDate, setUsageDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([])
  const [duplicateMessage, setDuplicateMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelectedPatient(initialPatient || null)
    setUsageDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setError('')
    setSuccess('')
    setDuplicateMessage('')
    setSaving(false)
    setLines(item ? [{
      inventory_item: item.id,
      item,
      quantity: '1',
      reason: '',
    }] : [])
  }, [open, item, initialPatient])

  const excludedIds = useMemo(() => lines.map(line => line.inventory_item), [lines])
  const itemCount = lines.length

  if (!open) return null

  function addItem(selectedItem) {
    if (lines.some(line => String(line.inventory_item) === String(selectedItem.id))) {
      setDuplicateMessage('This item has already been added.')
      return
    }
    setDuplicateMessage('')
    setLines(current => [
      ...current,
      {
        inventory_item: selectedItem.id,
        item: selectedItem,
        quantity: '1',
        reason: '',
      },
    ])
  }

  function updateLine(index, changes) {
    setLines(current => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line))
  }

  function removeLine(index) {
    setLines(current => current.filter((_, lineIndex) => lineIndex !== index))
  }

  function availableText(line) {
    return `${line.item?.current_stock ?? '0'} ${line.item?.unit_of_measure || 'units'}`
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!selectedPatient?.id) {
      setError('Select a patient before saving inventory usage.')
      return
    }
    if (!lines.length) {
      setError('Add at least one inventory item.')
      return
    }
    const overdrawn = lines.find(line => decimalValue(line.quantity) > decimalValue(line.item?.current_stock))
    if (overdrawn) {
      setError(`Insufficient stock for ${overdrawn.item.name}. Available: ${overdrawn.item.current_stock}, requested: ${overdrawn.quantity}.`)
      return
    }
    try {
      setSaving(true)
      const response = await bulkIssueStock({
        patient: selectedPatient.id,
        usage_date: usageDate || undefined,
        notes,
        items: lines.map(line => ({
          inventory_item: line.inventory_item,
          quantity: line.quantity,
          reason: line.reason,
        })),
      })
      setSuccess(`Inventory usage recorded successfully. ${response.usage_count} items recorded for ${displayPatientName(response.patient || selectedPatient)}.`)
      await onSaved?.(response)
      setLines([])
      if (!patientLocked) setSelectedPatient(null)
      onClose?.()
    } catch (apiError) {
      const detail = apiError?.response?.data?.detail || apiError?.response?.data?.non_field_errors?.[0] || apiError?.response?.data?.[0]
      setError(detail || 'Unable to record inventory usage. Check stock level and required fields.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4">
      <div className="mx-auto max-h-[92vh] w-[94vw] max-w-6xl overflow-y-auto rounded-lg bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Record Inventory Usage</h2>
            <p className="text-sm text-gray-500">Link stock usage to the selected patient and save all items together.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1 text-xl leading-none hover:bg-gray-100">x</button>
        </div>

        {error && <p role="alert" className="mb-3 rounded bg-red-50 p-3 text-red-800">{error}</p>}
        {success && <p className="mb-3 rounded bg-emerald-50 p-3 text-emerald-800">{success}</p>}

        <form onSubmit={submit} className="space-y-6">
          <section className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <PatientSearchSelect selectedPatient={selectedPatient} onSelect={setSelectedPatient} disabled={patientLocked} />
            <Input label="Usage Date" type="date" value={usageDate} onChange={event => setUsageDate(event.target.value)} />
          </section>

          {selectedPatient && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              <span className="font-semibold text-gray-900">{displayPatientName(selectedPatient)}</span>
              <span className="ml-2 text-gray-600">{patientSummary(selectedPatient)}</span>
            </div>
          )}

          <section className="space-y-3">
            <InventoryItemSearchSelect onSelect={addItem} excludedIds={excludedIds} />
            {duplicateMessage && <p className="text-sm text-amber-700">{duplicateMessage}</p>}
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-3 text-left">Item</th>
                    <th className="px-3 py-3 text-left">Available Stock</th>
                    <th className="px-3 py-3 text-left">Quantity</th>
                    <th className="px-3 py-3 text-left">Unit</th>
                    <th className="px-3 py-3 text-left">Reason</th>
                    <th className="px-3 py-3 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {lines.map((line, index) => (
                    <tr key={line.inventory_item}>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-gray-900">{line.item?.name}</p>
                        <p className="text-xs text-gray-500">{itemSummary(line.item)}</p>
                      </td>
                      <td className="px-3 py-3">{availableText(line)}</td>
                      <td className="px-3 py-3">
                        <input
                          aria-label={`Quantity for ${line.item?.name}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={line.quantity}
                          onChange={event => updateLine(index, { quantity: event.target.value })}
                          className="w-24 rounded-md border border-gray-300 px-3 py-2"
                          required
                        />
                      </td>
                      <td className="px-3 py-3">{line.item?.unit_of_measure || 'unit'}</td>
                      <td className="px-3 py-3">
                        <input
                          aria-label={`Reason for ${line.item?.name}`}
                          value={line.reason}
                          onChange={event => updateLine(index, { reason: event.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2"
                          placeholder="Reason or procedure"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button type="button" onClick={() => removeLine(index)} className="font-semibold text-red-700 hover:underline">Remove</button>
                      </td>
                    </tr>
                  ))}
                  {!lines.length && (
                    <tr>
                      <td colSpan="6" className="px-3 py-8 text-center text-gray-500">No inventory items selected.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <Input label="Notes" textarea rows={2} value={notes} onChange={event => setNotes(event.target.value)} />

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-gray-700">Items selected: {itemCount}</p>
            <div className="flex justify-end gap-3">
              <Button type="button" onClick={onClose} className="bg-gray-700 hover:bg-gray-800" disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Inventory Usage'}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
