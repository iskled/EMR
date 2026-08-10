import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AuditLogPage from './AuditLogPage'

const service = vi.hoisted(() => ({
  clearAuditEvents: vi.fn(), exportAuditEvents: vi.fn(), getAuditEvents: vi.fn(), getAuditMetrics: vi.fn(),
}))
vi.mock('../services/audit.service', () => service)

describe('AuditLogPage', () => {
  it('clears all visible logs with one button click', async () => {
    service.getAuditEvents.mockResolvedValueOnce({results:[{id:1, event_id:'e1', timestamp:'2026-08-07T00:00:00Z', action:'login_success', resource_type:'User', success:true}]})
      .mockResolvedValueOnce({results:[]})
    service.getAuditMetrics.mockResolvedValue({})
    service.clearAuditEvents.mockResolvedValue({cleared:1})
    render(<AuditLogPage />)
    await screen.findByText('login_success')
    const clearButton = await screen.findByRole('button', {name:'Clear all logs'})
    fireEvent.click(clearButton)
    await waitFor(() => expect(service.clearAuditEvents).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('status')).toHaveTextContent('1 audit log cleared.')
    expect(service.getAuditEvents).toHaveBeenCalledTimes(2)
  })
})
