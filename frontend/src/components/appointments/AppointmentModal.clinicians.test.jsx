import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AppointmentModal from './AppointmentModal'

vi.mock('../tasks/PatientSelector', () => ({ default: () => <div>Patient lookup</div> }))
vi.mock('./AvailableSlots', () => ({ default: () => <div>Availability</div> }))

const types = [{ id: 1, name: 'Consultation', default_duration: 30 }]
const dentists = [{ id: 12, first_name: 'Adeagbo', last_name: 'Salami', full_name: 'Adeagbo Salami', email: 'adeagbo@test.local', role: 'dentist', is_active: true }]

function renderModal(props = {}) {
  return render(<AppointmentModal isOpen onClose={vi.fn()} onSaved={vi.fn()} appointmentTypes={types} patients={[]} dentists={dentists} {...props} />)
}

describe('AppointmentModal clinician selector', () => {
  it('shows clinician loading state without an apparently empty selector', () => {
    renderModal({ dentists: [], clinicianLoading: true })
    expect(screen.getAllByText('Loading dentists...')).toHaveLength(2)
    expect(screen.getByRole('option', { name: 'Loading dentists...' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Dentist/)).toBeDisabled()
  })

  it('renders full names and stores the authoritative clinician id', () => {
    renderModal()
    const select = screen.getByLabelText(/Dentist/)
    expect(screen.getByRole('option', { name: 'Dr Adeagbo Salami' })).toBeInTheDocument()
    fireEvent.change(select, { target: { value: '12' } })
    expect(select).toHaveValue('12')
  })

  it('shows independent error and retry state', () => {
    const retry = vi.fn()
    renderModal({ dentists: [], clinicianError: 'Unable to load dentists.', onRetryClinicians: retry })
    expect(screen.getByText('Unable to load dentists.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('shows a clear empty state', () => {
    renderModal({ dentists: [] })
    expect(screen.getByText('No active dentists are available for booking.')).toBeInTheDocument()
  })

  it('preserves an inactive historical dentist while editing', () => {
    renderModal({ dentists: [], appointment: { id: 'a1', dentist: 99, dentist_name: 'Former Clinician', patient: 'p1', appointment_type: 1, scheduled_date: '2026-08-08', start_time: '09:00', duration_minutes: 30, status: 'scheduled' } })
    expect(screen.getByRole('option', { name: 'Dr Former Clinician — Inactive' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Dentist/)).toHaveValue('99')
  })
})
