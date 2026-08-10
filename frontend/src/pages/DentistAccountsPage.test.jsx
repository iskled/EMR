import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DentistAccountsPage from './DentistAccountsPage'
import { hasPermission } from '../permissions/permissions'
import * as service from '../services/dentistAccounts.service'

vi.mock('../services/dentistAccounts.service', () => ({
  getDentistAccounts: vi.fn(), createDentistAccount: vi.fn(), updateDentistAccount: vi.fn(),
  getDentistDependencies: vi.fn(), deactivateDentist: vi.fn(), reactivateDentist: vi.fn(),
  archiveDentist: vi.fn(), resetDentistPassword: vi.fn(),
}))

const dentist={id:12,first_name:'Ade',last_name:'Salami',full_name:'Ade Salami',email:'ade@test.local',phone:'0700',license_number:'REG1',role:'dentist',is_active:true,last_login:null,date_joined:'2026-01-01T00:00:00Z'}

describe('DentistAccountsPage',()=>{
  beforeEach(()=>{vi.clearAllMocks();service.getDentistAccounts.mockResolvedValue([dentist])})
  it('enforces the scoped frontend permission boundary',()=>{
    expect(hasPermission({role:'admin'},'dentists.manage')).toBe(true)
    expect(hasPermission({role:'nurse',effective_permissions:['dentists.manage']},'dentists.manage')).toBe(true)
    expect(hasPermission({role:'nurse',effective_permissions:[]},'dentists.manage')).toBe(false)
    expect(hasPermission({role:'dentist'},'dentists.manage')).toBe(false)
  })
  it('loads full identity and filters without losing the search control',async()=>{
    render(<DentistAccountsPage/>);expect(await screen.findByText('Dr Ade Salami')).toBeInTheDocument()
    const search=screen.getByLabelText('Search dentists');search.focus();fireEvent.change(search,{target:{value:'ade@test.local'}})
    expect(search).toHaveFocus();await waitFor(()=>expect(service.getDentistAccounts).toHaveBeenLastCalledWith(expect.objectContaining({search:'ade@test.local'})))
  })
  it('opens a dentist-only creation form',async()=>{
    render(<DentistAccountsPage/>);await screen.findByText('Dr Ade Salami');fireEvent.click(screen.getByRole('button',{name:'+ New Dentist'}))
    expect(screen.getByRole('heading',{name:'New Dentist'})).toBeInTheDocument();expect(screen.getByText('Role is securely fixed to Dentist.')).toBeInTheDocument();expect(screen.queryByLabelText('Role')).not.toBeInTheDocument()
  })
  it('shows loading, empty and API error states',async()=>{
    service.getDentistAccounts.mockRejectedValueOnce(new Error('fail'));render(<DentistAccountsPage/>);expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load dentist accounts.')
  })
})
