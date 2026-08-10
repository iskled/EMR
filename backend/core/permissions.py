from rest_framework.permissions import BasePermission, SAFE_METHODS


ROLES = {
    'ADMIN': 'admin',
    'DENTIST': 'dentist',
    'ASSISTANT': 'assistant',
    'RECEPTIONIST': 'receptionist',
    'NURSE': 'nurse',
    'BACKOFFICE': 'backoffice',
}


PERMISSIONS = {
    'dashboard.view': {'admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'},
    'patients.view': {'admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'},
    'patients.write': {'admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'},
    'patients.delete': {'admin'},
    'clinical.view': {'admin', 'dentist', 'assistant', 'nurse'},
    'clinical.write': {'admin', 'dentist', 'assistant', 'nurse'},
    'clinical.sign': {'admin', 'dentist'},
    'appointments.view': {'admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'},
    'appointments.write': {'admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'},
    'appointments.delete': {'admin'},
    'orthodontics.view': {'admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'},
    'orthodontics.write': {'admin', 'dentist', 'assistant', 'nurse'},
    'inventory.view': {'admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'},
    'inventory.create': {'admin'},
    'inventory.receive': {'admin', 'assistant', 'nurse', 'backoffice'},
    'inventory.adjust_increase': {'admin', 'assistant', 'nurse', 'backoffice'},
    'inventory.adjust_decrease': {'admin'},
    'inventory.delete': {'admin'},
    'inventory.archive': {'admin'},
    'inventory.write': {'admin'},
    'inventory.usage': {'admin', 'dentist', 'assistant', 'receptionist', 'nurse'},
    'inventory.adjust': {'admin'},
    'reports.view': {'admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'},
    'reports.export': {'admin', 'dentist', 'assistant', 'nurse'},
    'tasks.view': {'admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'},
    'tasks.create': {'admin'},
    'tasks.write': {'admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice'},
    'tasks.assign': {'admin'},
    'tasks.edit': {'admin'},
    'tasks.delete': {'admin'},
    'tasks.archive': {'admin'},
    'tasks.manage': {'admin'},
    'settings.view': {'admin', 'dentist'},
    'settings.write': {'admin'},
    'audit.view': {'admin'},
    'audit.export': {'admin'},
    'security.view': {'admin'},
    'security.manage': {'admin'},
    'users.manage': {'admin'},
    'users.view': {'admin'},
    'dentists.manage': {'admin'},
}


def has_permission(user, permission):
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'is_superuser', False):
        return True
    if permission == 'dentists.manage' and getattr(user, 'role', None) == 'nurse':
        return bool(getattr(user, 'can_manage_dentists', False))
    return getattr(user, 'role', None) in PERMISSIONS.get(permission, set())


def permission_matrix():
    roles = ['admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice']
    return [
        {
            'permission': permission,
            **{role: role in allowed for role in roles},
        }
        for permission, allowed in sorted(PERMISSIONS.items())
    ]


class HasPermission(BasePermission):
    permission_required = None

    def has_permission(self, request, view):
        permission = getattr(view, 'permission_required', None) or self.permission_required
        return has_permission(request.user, permission)


class AdminOnlyPermission(BasePermission):
    def has_permission(self, request, view):
        allowed = has_permission(request.user, 'security.view')
        if not allowed and getattr(request.user, 'is_authenticated', False):
            from core.audit_service import audit_event
            audit_event(
                'access_denied',
                getattr(view, 'basename', '') or view.__class__.__name__,
                request=request,
                success=False,
                failure_reason='admin_only_permission_required',
                source_module='security',
            )
        return allowed


class MatrixPermission(BasePermission):
    permission_map = {}
    default_permission = None

    def _permission_for(self, request, view):
        action = getattr(view, 'action', None)
        if action and action in self.permission_map:
            return self.permission_map[action]
        if request.method in SAFE_METHODS and 'read' in self.permission_map:
            return self.permission_map['read']
        if request.method == 'DELETE' and 'delete' in self.permission_map:
            return self.permission_map['delete']
        if 'write' in self.permission_map:
            return self.permission_map['write']
        return self.default_permission

    def has_permission(self, request, view):
        permission = self._permission_for(request, view)
        return has_permission(request.user, permission)
