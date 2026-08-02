export const PERMISSIONS = {
  'dashboard.view': ['admin', 'dentist', 'assistant', 'receptionist'],
  'patients.view': ['admin', 'dentist', 'assistant', 'receptionist'],
  'patients.write': ['admin', 'dentist', 'assistant', 'receptionist'],
  'appointments.view': ['admin', 'dentist', 'assistant', 'receptionist'],
  'clinical.view': ['admin', 'dentist', 'assistant'],
  'clinical.write': ['admin', 'dentist', 'assistant'],
  'clinical.sign': ['admin', 'dentist'],
  'orthodontics.view': ['admin', 'dentist', 'assistant', 'receptionist'],
  'inventory.view': ['admin', 'dentist', 'assistant', 'receptionist'],
  'reports.view': ['admin', 'dentist', 'assistant', 'receptionist'],
  'reports.export': ['admin', 'dentist', 'assistant'],
  'tasks.view': ['admin', 'dentist', 'assistant', 'receptionist'],
  'billing.view': ['admin'],
  'settings.view': ['admin', 'dentist'],
  'audit.view': ['admin'],
  'security.view': ['admin'],
  'users.manage': ['admin'],
  'users.view': ['admin'],
}

export function hasPermission(user, permission) {
  if (!user || !permission) return false
  return PERMISSIONS[permission]?.includes(user.role) || false
}

export function usePermissions(user) {
  return {
    can: permission => hasPermission(user, permission),
    role: user?.role,
  }
}
