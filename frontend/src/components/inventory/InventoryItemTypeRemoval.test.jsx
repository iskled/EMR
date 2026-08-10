import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import InventoryFilters from './InventoryFilters'
import InventoryItemModal from './InventoryItemModal'
import InventoryTable from './InventoryTable'

vi.mock('../../services/inventory.service', () => ({ createInventoryItem: vi.fn(), updateInventoryItem: vi.fn() }))

describe('Inventory classification', () => {
  it('does not show Item type in create/edit forms or filters', () => {
    const { rerender } = render(<InventoryItemModal open categories={[{id:1,name:'Consumables'}]} onClose={vi.fn()} />)
    expect(screen.queryByLabelText('Item type')).not.toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    rerender(<InventoryFilters filters={{search:'',category:'',storage_location:'',is_active:''}} categories={[{id:1,name:'Consumables'}]} onChange={vi.fn()} onReset={vi.fn()} />)
    expect(screen.queryByLabelText('Item type')).not.toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
  })

  it('removes the Type column from the inventory table', () => {
    render(<InventoryTable items={[{id:1,name:'Gloves',sku:'G1',unit_of_measure:'box',item_type:'consumable',category_name:'Consumables',current_stock:2,reorder_level:1,stock_value:10}]} />)
    expect(screen.queryByRole('columnheader', {name:'Type'})).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', {name:'Category'})).toBeInTheDocument()
  })
})
