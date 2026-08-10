import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AppointmentTable from './AppointmentTable'

const appointment = { id:'a1', scheduled_date:'2026-08-07', start_time:'09:00', end_time:'09:30', patient_name:'Test Patient', patient_code:'P1', dentist_name:'Dr Test', type_name:'Review', type_color:'#2563eb', status:'scheduled' }

describe('AppointmentTable actions', () => {
  it('shows only Edit, Delete, and Cancel actions', () => {
    const onEdit = vi.fn(); const onDelete = vi.fn(); const onCancel = vi.fn()
    render(<AppointmentTable appointments={[appointment]} onEdit={onEdit} onDelete={onDelete} onCancel={onCancel} />)
    expect(screen.getAllByRole('button').map(button => button.textContent.trim())).toEqual(['Edit', 'Delete', 'Cancel'])
    fireEvent.click(screen.getByRole('button', {name:'Edit'}))
    fireEvent.click(screen.getByRole('button', {name:'Delete'}))
    fireEvent.click(screen.getByRole('button', {name:'Cancel'}))
    expect(onEdit).toHaveBeenCalledWith(appointment)
    expect(onDelete).toHaveBeenCalledWith(appointment)
    expect(onCancel).toHaveBeenCalledWith(appointment)
    expect(screen.queryByRole('button', {name:'Details'})).not.toBeInTheDocument()
    expect(screen.queryByRole('button', {name:'Clinical'})).not.toBeInTheDocument()
    expect(screen.queryByRole('button', {name:'Billing'})).not.toBeInTheDocument()
  })
})
