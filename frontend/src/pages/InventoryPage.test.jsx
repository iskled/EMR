import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InventoryPage from './InventoryPage'

let currentUser = { role: 'admin' }

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: currentUser }),
}))

vi.mock('../services/inventory.service', () => ({
  getInventoryDashboard: vi.fn().mockResolvedValue({}),
  getInventoryItems: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: 'Bracket Kit',
      sku: 'SKU260809-1',
      unit_of_measure: 'pack',
      category_name: 'Orthodontics',
      current_stock: '5.00',
      reorder_level: '2.00',
      stock_value: '50.00',
    },
  ]),
  getInventoryCategories: vi.fn().mockResolvedValue([]),
  getInventoryLocations: vi.fn().mockResolvedValue([]),
  getSuppliers: vi.fn().mockResolvedValue([]),
  getInventoryBatches: vi.fn().mockResolvedValue([]),
  getPurchaseOrders: vi.fn().mockResolvedValue([]),
  getInventoryAlerts: vi.fn().mockResolvedValue([]),
  getStockMovements: vi.fn().mockResolvedValue([]),
  createInventoryItem: vi.fn(),
  updateInventoryItem: vi.fn(),
  receiveStock: vi.fn(),
  issueStock: vi.fn(),
  bulkIssueStock: vi.fn(),
  adjustStock: vi.fn(),
  createPurchaseOrder: vi.fn(),
  receivePurchaseOrder: vi.fn(),
  submitPurchaseOrder: vi.fn(),
  acknowledgeAlert: vi.fn(),
  resolveAlert: vi.fn(),
}))

describe('InventoryPage permissions', () => {
  beforeEach(() => {
    currentUser = { role: 'admin' }
  })

  async function renderItemsFor(role) {
    currentUser = { role }
    render(<InventoryPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Items' }))
    await waitFor(() => expect(screen.getByText('Bracket Kit')).toBeInTheDocument())
  }

  it('shows New Item only to admin users', async () => {
    await renderItemsFor('admin')
    expect(screen.getByRole('button', { name: 'New Item' })).toBeInTheDocument()
  })

  it('hides New Item for all non-admin users', async () => {
    for (const role of ['dentist', 'assistant', 'receptionist', 'nurse', 'backoffice']) {
      cleanup()
      await renderItemsFor(role)
      expect(screen.queryByRole('button', { name: 'New Item' })).not.toBeInTheDocument()
    }
  })

  it('shows Use for non-backoffice roles and hides it for backoffice', async () => {
    for (const role of ['admin', 'dentist', 'assistant', 'receptionist', 'nurse']) {
      cleanup()
      await renderItemsFor(role)
      expect(screen.getByRole('button', { name: 'Use' })).toBeInTheDocument()
    }
    cleanup()
    await renderItemsFor('backoffice')
    expect(screen.queryByRole('button', { name: 'Use' })).not.toBeInTheDocument()
  })
})
