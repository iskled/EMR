import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AppointmentDrawer from './AppointmentDrawer'

const base = { id: 'a1', patient_name: 'Test Patient', patient_code: 'P1', dentist_name: 'Dr Test', type_name: 'Review', scheduled_date: '2026-08-06', start_time: '09:00', end_time: '09:30', status: 'no_show' }

describe('AppointmentDrawer No Show actions', () => {
  it('offers archive and delete for No Show appointments', () => {
    const onArchive = vi.fn(); const onDelete = vi.fn()
    render(<AppointmentDrawer open appointment={base} patientHistory={[]} onArchive={onArchive} onDelete={onDelete} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Archive No Show' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete No Show' }))
    expect(onArchive).toHaveBeenCalledWith(base)
    expect(onDelete).toHaveBeenCalledWith(base)
  })

  it('hides retention actions for other statuses', () => {
    render(<AppointmentDrawer open appointment={{...base, status:'scheduled'}} patientHistory={[]} onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Archive No Show' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete No Show' })).not.toBeInTheDocument()
  })
})
