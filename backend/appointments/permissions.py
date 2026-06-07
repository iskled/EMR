from rest_framework.permissions import BasePermission, SAFE_METHODS


def _role(user):
    return getattr(user, 'role', None)


class CanManageAppointments(BasePermission):
    """
    All authenticated staff can view and create appointments.
    Only admin can delete.
    Dentists see only their own appointments (enforced in queryset).
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            return _role(request.user) == 'admin'
        return _role(request.user) in ('admin', 'dentist', 'receptionist', 'assistant')

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        # Dentists can only modify their own appointments
        if _role(request.user) == 'dentist':
            dentist_field = getattr(obj, 'dentist_id', None)
            return dentist_field == request.user.id
        return True


class CanManageWaitingList(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            return _role(request.user) in ('admin', 'receptionist')
        return _role(request.user) in ('admin', 'dentist', 'receptionist', 'assistant')
