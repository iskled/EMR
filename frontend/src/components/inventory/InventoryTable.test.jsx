import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import InventoryTable from './InventoryTable'

const items = [
  {
    id: 1,
    name: 'Bracket Kit',
    sku: 'BR-001',
    unit_of_measure: 'pack',
    category_name: 'Orthodontics',
    current_stock: '5.00',
    reorder_level: '2.00',
    stock_value: '50.00',
  },
]

describe('InventoryTable permissions', () => {
  it('shows backoffice receiving controls and hides usage and adjustment controls', () => {
    render(<InventoryTable items={items} onReceive={vi.fn()} canReceive />)
    expect(screen.getByText('Bracket Kit')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Receive' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Use' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Adjust' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bracket Kit' })).not.toBeInTheDocument()
  })

  it('shows usage without item creation/editing for non-backoffice operational users', () => {
    render(<InventoryTable items={items} onUse={vi.fn()} canUse />)
    expect(screen.getByText('Bracket Kit')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bracket Kit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Receive' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Adjust' })).not.toBeInTheDocument()
  })

  it('shows all operational controls to users with all inventory capabilities', () => {
    render(<InventoryTable items={items} onEdit={vi.fn()} onReceive={vi.fn()} onUse={vi.fn()} onAdjust={vi.fn()} canEdit canReceive canUse canAdjust />)
    expect(screen.getByRole('button', { name: 'Bracket Kit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Receive' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adjust' })).toBeInTheDocument()
  })
})
