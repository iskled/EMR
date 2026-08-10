export const PERMISSIONS = {
  'dashboard.view': ['admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'],
  'patients.view': ['admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'],
  'patients.write': ['admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'],
  'appointments.view': ['admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'],
  'appointments.write': ['admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'],
  'clinical.view': ['admin', 'dentist', 'assistant', 'nurse'],
  'clinical.write': ['admin', 'dentist', 'assistant', 'nurse'],
  'clinical.sign': ['admin', 'dentist'],
  'orthodontics.view': ['admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'],
  'inventory.view': ['admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'],
  'inventory.create': ['admin'],
  'inventory.receive': ['admin', 'assistant', 'nurse', 'backoffice'],
  'inventory.adjust_increase': ['admin', 'assistant', 'nurse', 'backoffice'],
  'inventory.adjust_decrease': ['admin'],
  'inventory.delete': ['admin'],
  'inventory.archive': ['admin'],
  'inventory.write': ['admin'],
  'inventory.usage': ['admin', 'dentist', 'assistant', 'receptionist', 'nurse'],
  'inventory.adjust': ['admin'],
  'reports.view': ['admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'],
  'reports.export': ['admin', 'dentist', 'assistant', 'nurse'],
  'tasks.view': ['admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'],
  'tasks.create': ['admin'],
  'tasks.write': ['admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'],
  'tasks.assign': ['admin'],
  'tasks.edit': ['admin'],
  'tasks.delete': ['admin'],
  'tasks.archive': ['admin'],
  'tasks.manage': ['admin'],
  'billing.view': ['admin'],
  'settings.view': ['admin', 'dentist'],
  'audit.view': ['admin'],
  'security.view': ['admin'],
  'users.manage': ['admin'],
  'users.view': ['admin'],
  'dentists.manage': ['admin'],
}

export function hasPermission(user, permission) {
  if (!user || !permission) return false
  return user.effective_permissions?.includes(permission) || PERMISSIONS[permission]?.includes(user.role) || false
}

export function usePermissions(user) {
  return {
    can: permission => hasPermission(user, permission),
    role: user?.role,
  }
}
