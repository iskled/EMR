from rest_framework.permissions import BasePermission, SAFE_METHODS

from core.constants.roles import (
    ALL_ROLES,
    CLINICAL_ROLES,
    WRITE_ROLES,
    ADMIN_ONLY,
)


def _has_role(user, *roles):
    return user.is_authenticated and getattr(user, 'role', None) in roles


class CanViewPatients(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request.user, *ALL_ROLES)


class CanManagePatients(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return _has_role(request.user, *ALL_ROLES)

        if request.method == 'DELETE':
            return _has_role(request.user, *ADMIN_ONLY)

        return _has_role(request.user, *WRITE_ROLES)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            if request.user.role == 'dentist':
                return obj.assigned_dentist_id == request.user.id

            return True

        if request.method == 'DELETE':
            return _has_role(request.user, *ADMIN_ONLY)

        return _has_role(request.user, *WRITE_ROLES)


class CanManageMedicalHistory(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return _has_role(request.user, *ALL_ROLES)

        return _has_role(request.user, *CLINICAL_ROLES)


class CanManageDocuments(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.method == 'DELETE':
            return _has_role(request.user, *CLINICAL_ROLES)

        return _has_role(request.user, *ALL_ROLES)
