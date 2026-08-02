from rest_framework.permissions import BasePermission, SAFE_METHODS


ROLES = {
    'ADMIN': 'admin',
    'DENTIST': 'dentist',
    'ASSISTANT': 'assistant',
    'RECEPTIONIST': 'receptionist',
}


PERMISSIONS = {
    'dashboard.view': {'admin', 'dentist', 'assistant', 'receptionist'},
    'patients.view': {'admin', 'dentist', 'assistant', 'receptionist'},
    'patients.write': {'admin', 'dentist', 'assistant', 'receptionist'},
    'patients.delete': {'admin'},
    'clinical.view': {'admin', 'dentist', 'assistant'},
    'clinical.write': {'admin', 'dentist', 'assistant'},
    'clinical.sign': {'admin', 'dentist'},
    'appointments.view': {'admin', 'dentist', 'assistant', 'receptionist'},
    'appointments.write': {'admin', 'dentist', 'assistant', 'receptionist'},
    'appointments.delete': {'admin'},
    'orthodontics.view': {'admin', 'dentist', 'assistant', 'receptionist'},
    'orthodontics.write': {'admin', 'dentist', 'assistant'},
    'inventory.view': {'admin', 'dentist', 'assistant', 'receptionist'},
    'inventory.write': {'admin', 'assistant'},
    'inventory.usage': {'admin', 'dentist', 'assistant'},
    'inventory.adjust': {'admin'},
    'reports.view': {'admin', 'dentist', 'assistant', 'receptionist'},
    'reports.export': {'admin', 'dentist', 'assistant'},
    'tasks.view': {'admin', 'dentist', 'assistant', 'receptionist'},
    'tasks.write': {'admin', 'dentist', 'assistant', 'receptionist'},
    'tasks.assign': {'admin', 'dentist', 'assistant'},
    'tasks.delete': {'admin'},
    'settings.view': {'admin', 'dentist'},
    'settings.write': {'admin'},
    'audit.view': {'admin'},
    'audit.export': {'admin'},
    'security.view': {'admin'},
    'security.manage': {'admin'},
    'users.manage': {'admin'},
    'users.view': {'admin'},
}


def has_permission(user, permission):
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'is_superuser', False):
        return True
    return getattr(user, 'role', None) in PERMISSIONS.get(permission, set())


def permission_matrix():
    roles = ['admin', 'dentist', 'assistant', 'receptionist']
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
        return has_permission(request.user, 'security.view')


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
