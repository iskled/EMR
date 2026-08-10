import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TaskProgressPath } from './TaskDrawer'

describe('TaskProgressPath', () => {
  it('renders every accessible stage and authoritative percentages', () => {
    render(<TaskProgressPath task={{status:'waiting_for_vendor'}} interactive onSelect={vi.fn()} />)
    expect(screen.getAllByRole('button')).toHaveLength(7)
    expect(screen.getByRole('button', {name:/Waiting for Vendor, current stage, 50 percent/})).toHaveAttribute('aria-current','step')
    expect(screen.getByRole('button', {name:/Accepted, completed stage, 25 percent/})).toBeDisabled()
  })

  it('only invokes permitted transitions', () => {
    const onSelect = vi.fn()
    render(<TaskProgressPath task={{status:'in_progress'}} interactive onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', {name:/Resolved, future stage, 90 percent complete, clickable/}))
    expect(onSelect).toHaveBeenCalledWith('resolved')
    expect(screen.getByRole('button', {name:/Closed, future stage, 100 percent/})).toBeDisabled()
  })
})
