from rest_framework.permissions import BasePermission, SAFE_METHODS


ORTHODONTIC_BASENAMES = {
    'orthodontic-case',
    'orthodontic-visit',
    'orthodontic-photo',
    'orthodontic-document',
}


class CanManageClinical(BasePermission):
    """
    Admin + dentist: full access.
    Receptionist: read-only.
    Assistant: read clinical notes + images; cannot modify.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user, 'role', None)
        if role in ('admin', 'dentist'):
            return True
        

        if role == 'assistant':
            return request.method in (
                'GET',
                'POST',
                'PUT',
                'PATCH'
            )

        if role == 'backoffice':
            return request.method in SAFE_METHODS and getattr(view, 'basename', '') in ORTHODONTIC_BASENAMES

        if role == 'receptionist':
            return False

        return False



    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        role = getattr(request.user, 'role', None)

        if role == 'admin':
            return True

        if role == 'dentist':
            dentist_field = getattr(obj, 'dentist', None)

            if dentist_field:
                return dentist_field == request.user

            return True

        if role == 'assistant':
            return True

        if role == 'backoffice':
            return request.method in SAFE_METHODS and getattr(view, 'basename', '') in ORTHODONTIC_BASENAMES

        return False


class CanSignNotes(BasePermission):
    """Only dentists and admins can sign clinical notes."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, 'role', None) in ('admin', 'dentist')
