from rest_framework.permissions import BasePermission, SAFE_METHODS


class CanViewReports(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user, 'role', None)
        if request.method in SAFE_METHODS:
            return role in ('admin', 'dentist', 'assistant', 'receptionist', 'nurse', 'backoffice')
        return role in ('admin', 'dentist', 'assistant')

    def has_object_permission(self, request, view, obj):
        if getattr(request.user, 'role', None) == 'admin':
            return True
        return obj.is_shared or obj.owner_id == request.user.id
