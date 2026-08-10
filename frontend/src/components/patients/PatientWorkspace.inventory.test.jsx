import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PatientWorkspace from './PatientWorkspace'

let currentUser = { role: 'dentist' }
let modalProps = null

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: currentUser }),
}))

vi.mock('../../services/orthodontics.service', () => ({
  getOrthodonticCases: vi.fn().mockResolvedValue([]),
}))

vi.mock('./PatientOverview', () => ({
  default: () => <div>Patient overview</div>,
}))

vi.mock('../inventory/StockUsageModal', () => ({
  default: props => {
    modalProps = props
    return props.open ? <div>Inventory usage modal for {props.initialPatient.full_name}</div> : null
  },
}))

const patient = {
  id: 'patient-1',
  full_name: 'Latifat Ajasa',
  patient_code: '2026072601',
  phone_primary: '08034235678',
}

describe('PatientWorkspace inventory usage action', () => {
  beforeEach(() => {
    currentUser = { role: 'dentist' }
    modalProps = null
  })

  it('shows the action to users with patient and inventory usage permissions and preselects the patient', () => {
    render(<PatientWorkspace patient={patient} activeTab="overview" />)
    fireEvent.click(screen.getByRole('button', { name: 'Record Inventory Usage' }))
    expect(screen.getByText('Inventory usage modal for Latifat Ajasa')).toBeInTheDocument()
    expect(modalProps.initialPatient).toEqual(patient)
    expect(modalProps.patientLocked).toBe(true)
  })

  it('hides the action from backoffice users', () => {
    currentUser = { role: 'backoffice' }
    render(<PatientWorkspace patient={patient} activeTab="overview" />)
    expect(screen.queryByRole('button', { name: 'Record Inventory Usage' })).not.toBeInTheDocument()
  })
})
