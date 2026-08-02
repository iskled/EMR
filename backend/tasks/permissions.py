from rest_framework.permissions import BasePermission, SAFE_METHODS


CLINICAL_ROLES = {'admin', 'dentist', 'assistant'}


def user_can_see_task(user, task):
    if not user or not user.is_authenticated:
        return False
    if user.role == 'admin' or user.is_superuser:
        return True
    if task.task_type in {'clinical', 'orthodontic'} and user.role not in CLINICAL_ROLES:
        return False
    return (
        task.created_by_id == user.id
        or task.assigned_user_id == user.id
        or task.assigned_role == user.role
        or task.watchers.filter(id=user.id).exists()
    )


def parent_task(obj):
    if hasattr(obj, 'task'):
        return obj.task
    return obj


class CanManageTasks(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        task = parent_task(obj)
        if request.method == 'DELETE':
            return request.user.role == 'admin' or getattr(task, 'created_by_id', None) == request.user.id
        if request.method in SAFE_METHODS:
            return user_can_see_task(request.user, task)
        return user_can_see_task(request.user, task) or request.user.role == 'admin'


class CanManageChecklistTemplates(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in {'admin', 'dentist', 'assistant'}
