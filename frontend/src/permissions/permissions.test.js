import { describe, expect, it } from 'vitest'
import { hasPermission, PERMISSIONS } from './permissions'

describe('role permission matrix', () => {
  it('grants admin full administration and destructive inventory access', () => {
    const admin = { role: 'admin' }
    expect(hasPermission(admin, 'users.manage')).toBe(true)
    expect(hasPermission(admin, 'security.view')).toBe(true)
    expect(hasPermission(admin, 'audit.view')).toBe(true)
    expect(hasPermission(admin, 'tasks.create')).toBe(true)
    expect(hasPermission(admin, 'inventory.delete')).toBe(true)
  })

  it('grants backoffice operational workspaces without administration', () => {
    const backoffice = { role: 'backoffice' }
    expect(hasPermission(backoffice, 'dashboard.view')).toBe(true)
    expect(hasPermission(backoffice, 'patients.write')).toBe(true)
    expect(hasPermission(backoffice, 'appointments.write')).toBe(true)
    expect(hasPermission(backoffice, 'orthodontics.view')).toBe(true)
    expect(hasPermission(backoffice, 'inventory.create')).toBe(false)
    expect(hasPermission(backoffice, 'inventory.receive')).toBe(true)
    expect(hasPermission(backoffice, 'reports.view')).toBe(true)
    expect(hasPermission(backoffice, 'tasks.write')).toBe(true)
    expect(hasPermission(backoffice, 'tasks.create')).toBe(false)
    expect(hasPermission(backoffice, 'tasks.assign')).toBe(false)
    expect(hasPermission(backoffice, 'inventory.usage')).toBe(false)
    expect(hasPermission(backoffice, 'inventory.adjust_decrease')).toBe(false)
    expect(hasPermission(backoffice, 'inventory.delete')).toBe(false)
    expect(hasPermission(backoffice, 'settings.view')).toBe(false)
    expect(hasPermission(backoffice, 'users.manage')).toBe(false)
    expect(hasPermission(backoffice, 'dentists.manage')).toBe(false)
    expect(hasPermission(backoffice, 'security.view')).toBe(false)
    expect(hasPermission(backoffice, 'audit.view')).toBe(false)
  })

  it('keeps all declared permissions role arrays', () => {
    expect(Object.values(PERMISSIONS).every(value => Array.isArray(value))).toBe(true)
  })

  it('limits inventory creation to admin and allows usage for every non-backoffice role', () => {
    expect(hasPermission({ role: 'admin' }, 'inventory.create')).toBe(true)
    for (const role of ['dentist', 'assistant', 'receptionist', 'nurse', 'backoffice']) {
      expect(hasPermission({ role }, 'inventory.create')).toBe(false)
    }
    for (const role of ['admin', 'dentist', 'assistant', 'receptionist', 'nurse']) {
      expect(hasPermission({ role }, 'inventory.usage')).toBe(true)
    }
    expect(hasPermission({ role: 'backoffice' }, 'inventory.usage')).toBe(false)
  })
})
