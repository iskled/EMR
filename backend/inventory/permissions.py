from rest_framework.permissions import BasePermission, SAFE_METHODS

from core.audit_service import audit_event
from core.permissions import has_permission


WRITE_PERMISSION_BY_ACTION = {
    'create': 'inventory.create',
    'update': 'inventory.create',
    'partial_update': 'inventory.create',
    'destroy': 'inventory.delete',
    'receipt': 'inventory.receive',
    'receive': 'inventory.receive',
    'submit': 'inventory.receive',
    'usage': 'inventory.usage',
    'bulk_usage': 'inventory.usage',
    'adjustment': 'inventory.adjust_decrease',
    'transfer': 'inventory.adjust_decrease',
    'acknowledge': 'inventory.receive',
    'resolve': 'inventory.receive',
}


def deny_inventory(request, permission, view):
    if getattr(request.user, 'is_authenticated', False):
        audit_event(
            'inventory_permission_denied',
            getattr(view, 'basename', '') or view.__class__.__name__,
            request=request,
            success=False,
            failure_reason=f'missing {permission}',
            source_module='inventory',
        )
    return False


class CanManageInventory(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            permission = 'inventory.view'
        else:
            permission = WRITE_PERMISSION_BY_ACTION.get(getattr(view, 'action', ''), 'inventory.write')
        allowed = has_permission(request.user, permission)
        return allowed or deny_inventory(request, permission, view)


class CanDestructivelyAdjustInventory(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        allowed = has_permission(request.user, 'inventory.adjust_decrease')
        return allowed or deny_inventory(request, 'inventory.adjust_decrease', view)
