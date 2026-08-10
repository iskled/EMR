import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StockUsageModal from './StockUsageModal'
import { bulkIssueStock, getInventoryItems } from '../../services/inventory.service'
import { searchPatients } from '../../services/patients.service'

vi.mock('../../services/patients.service', () => ({
  searchPatients: vi.fn(),
}))

vi.mock('../../services/inventory.service', () => ({
  bulkIssueStock: vi.fn(),
  getInventoryItems: vi.fn(),
}))

const patient = {
  id: '7f7d5ca6-8471-405f-8c9c-72f6527a51fe',
  full_name: 'Latifat Ajasa',
  patient_code: '2026072601',
  phone_primary: '08034235678',
}

const items = [
  { id: 8, name: 'Lidocaine Cartridge', sku: 'LA-001', current_stock: '84.00', unit_of_measure: 'cartridges' },
  { id: 14, name: 'Composite A2', sku: 'CMP-A2', current_stock: '5.00', unit_of_measure: 'unit' },
]

describe('StockUsageModal patient-linked bulk workflow', () => {
  beforeEach(() => {
    searchPatients.mockResolvedValue([patient])
    getInventoryItems.mockResolvedValue(items)
    bulkIssueStock.mockResolvedValue({ patient, usage_count: 2, movements: [] })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  async function flushSearch(mock, calls = 1) {
    await waitFor(() => expect(mock).toHaveBeenCalledTimes(calls))
  }

  it('removes the raw Patient ID field and submits the internal Patient PK', async () => {
    render(<StockUsageModal open onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByLabelText('Patient ID')).not.toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Search by patient name, patient code, or phone'), { target: { value: 'Latifat' } })
    await flushSearch(searchPatients)
    fireEvent.click(await screen.findByText('Latifat Ajasa'))
    fireEvent.change(screen.getByPlaceholderText('Search by item name, code, category, or supplier'), { target: { value: 'lido' } })
    await flushSearch(getInventoryItems)
    fireEvent.click(await screen.findByText('Lidocaine Cartridge'))
    fireEvent.change(screen.getByLabelText('Quantity for Lidocaine Cartridge'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Inventory Usage' }))
    await waitFor(() => expect(bulkIssueStock).toHaveBeenCalled())
    expect(bulkIssueStock.mock.calls[0][0].patient).toBe(patient.id)
    expect(bulkIssueStock.mock.calls[0][0].patient).not.toBe(patient.patient_code)
  })

  it('supports multiple rows and sends one bulk request', async () => {
    render(<StockUsageModal open initialPatient={patient} patientLocked onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Search by item name, code, category, or supplier'), { target: { value: 'lido' } })
    await flushSearch(getInventoryItems)
    fireEvent.click(await screen.findByText('Lidocaine Cartridge'))
    fireEvent.change(screen.getByPlaceholderText('Search by item name, code, category, or supplier'), { target: { value: 'comp' } })
    await flushSearch(getInventoryItems, 2)
    fireEvent.click(await screen.findByText('Composite A2'))
    expect(screen.getByText('Items selected: 2')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Quantity for Lidocaine Cartridge'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Inventory Usage' }))
    await waitFor(() => expect(bulkIssueStock).toHaveBeenCalledTimes(1))
    expect(bulkIssueStock.mock.calls[0][0].items).toHaveLength(2)
  })

  it('blocks duplicate item selection and identifies insufficient stock', async () => {
    render(<StockUsageModal open initialPatient={patient} patientLocked onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Search by item name, code, category, or supplier'), { target: { value: 'lido' } })
    await flushSearch(getInventoryItems)
    fireEvent.click(await screen.findByText('Lidocaine Cartridge'))
    fireEvent.change(screen.getByLabelText('Quantity for Lidocaine Cartridge'), { target: { value: '85' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Inventory Usage' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Insufficient stock for Lidocaine Cartridge')
    expect(bulkIssueStock).not.toHaveBeenCalled()
  })
})
