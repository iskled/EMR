from rest_framework.permissions import BasePermission, SAFE_METHODS


class CanManageInventory(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user, 'role', None)
        if role == 'admin':
            return True
        if role in ('dentist', 'assistant', 'receptionist') and request.method in SAFE_METHODS:
            return True
        if role == 'dentist':
            return getattr(view, 'inventory_action', '') in ('usage',)
        if role == 'assistant':
            return True
        if role == 'receptionist':
            return getattr(view, 'inventory_action', '') in ('purchase_request',)
        return False


class CanDestructivelyAdjustInventory(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) == 'admin'
        )
