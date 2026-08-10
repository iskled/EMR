import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReminderPanel from './ReminderPanel'
import * as service from '../../services/appointments.service'

vi.mock('../../services/appointments.service', () => ({
  archiveReminder: vi.fn(), cancelReminder: vi.fn(), cancelReminderBooking: vi.fn(),
  contactReminder: vi.fn(), completeReminder: vi.fn(), getReminders: vi.fn(),
  rescheduleReminder: vi.fn(), restoreReminder: vi.fn(), restoreCancelledReminder: vi.fn(),
  transitionReminder: vi.fn(),
}))

const reminder = {
  id: 'r1', patient: 'p1', patient_name: 'John Doe', patient_code: 'P-1',
  patient_phone: '0700', reminder_type_label: 'Recall', recall_type: 'treatment',
  clinical_visit_type: 'Treatment', due_date: '2026-08-20', status: 'active',
}

describe('ReminderPanel workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    let current = reminder
    service.getReminders.mockImplementation((params) =>
      Promise.resolve(params?.archived === 'true' ? [] : [current]))
    service.contactReminder.mockImplementation(async (_id, payload) => {
      current = {...current, status: payload.outcome === 'confirmed' ? 'confirmed' : 'contacted'}
      return current
    })
  })

  it('shows synchronized tab counts and moves a contacted reminder without reloading the page', async () => {
    render(<ReminderPanel onBook={vi.fn()} />)
    expect(await screen.findByRole('button', {name: 'active (1)'})).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'contacted (0)'})).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: 'Contact'}))
    fireEvent.change(screen.getByLabelText('Contact notes'), {target: {value: 'Spoke with patient'}})
    fireEvent.click(screen.getByRole('button', {name: 'Save'}))

    await waitFor(() => expect(service.contactReminder).toHaveBeenCalledWith('r1', {
      method: 'phone', outcome: 'contacted', notes: 'Spoke with patient',
    }))
    expect(await screen.findByRole('button', {name: 'contacted (1)'})).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'active (0)'})).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Contact attempt recorded.')
  })

  it('does not book a reminder merely by opening the appointment form', async () => {
    service.getReminders.mockImplementation((params) => Promise.resolve(
      params?.archived === 'true' ? [] : [{...reminder, status: 'confirmed'}],
    ))
    const onBook = vi.fn()
    render(<ReminderPanel onBook={onBook} />)
    fireEvent.click(await screen.findByRole('button', {name: 'Book Appointment'}))
    expect(onBook).toHaveBeenCalledTimes(1)
    expect(service.transitionReminder).not.toHaveBeenCalled()
  })
})
