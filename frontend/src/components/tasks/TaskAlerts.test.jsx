import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TaskAlerts from './TaskAlerts'

const alert = { id: 1, task_title: 'Follow up supplier', message: 'Task is overdue.', alert_type: 'overdue', status: 'open' }

describe('TaskAlerts', () => {
  it('allows administrators to clear an active alert', () => {
    const onAction = vi.fn()
    render(<TaskAlerts alerts={[alert]} onAction={onAction} canClear />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear alert for Follow up supplier' }))
    expect(onAction).toHaveBeenCalledWith(alert, 'dismiss')
  })

  it('does not expose clear to non-admin users', () => {
    render(<TaskAlerts alerts={[alert]} onAction={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Clear alert for Follow up supplier' })).not.toBeInTheDocument()
  })
})
