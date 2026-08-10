from rest_framework.permissions import BasePermission, SAFE_METHODS

from core.audit_service import audit_event
from core.permissions import has_permission


CLINICAL_ROLES = {'admin', 'dentist', 'assistant'}
TASK_CREATION_MESSAGE = 'You do not have permission to create tasks.'


def deny_creation(request, resource_type, reason=TASK_CREATION_MESSAGE):
    audit_event(
        'task_creation_denied',
        resource_type,
        request=request,
        success=False,
        failure_reason='permission denied',
        source_module='tasks',
        metadata={'reason': reason},
    )
    return False


def is_admin(user):
    return bool(user and user.is_authenticated and (getattr(user, 'role', '') == 'admin' or getattr(user, 'is_superuser', False)))


def user_can_see_task(user, task):
    if not user or not user.is_authenticated:
        return False
    if is_admin(user):
        return True
    if task.task_type in {'clinical', 'orthodontic'} and user.role not in CLINICAL_ROLES:
        return False
    return task.assigned_user_id == user.id or task.watchers.filter(id=user.id).exists()


def user_can_work_task(user, task):
    if not user or not user.is_authenticated:
        return False
    if is_admin(user):
        return False
    return task.assigned_user_id == user.id


def parent_task(obj):
    if hasattr(obj, 'task'):
        return obj.task
    return obj


class CanManageTasks(BasePermission):
    message = TASK_CREATION_MESSAGE

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        action = getattr(view, 'action', None)
        basename = getattr(view, 'basename', '')
        if basename == 'task' and action in {'create', 'update', 'partial_update', 'destroy', 'reassign', 'claim', 'generate_next'}:
            permission = {
                'create': 'tasks.create', 'update': 'tasks.edit', 'partial_update': 'tasks.edit',
                'destroy': 'tasks.delete', 'reassign': 'tasks.assign', 'claim': 'tasks.assign',
                'generate_next': 'tasks.create',
            }[action]
            if not is_admin(request.user) or not has_permission(request.user, permission):
                self.message = f'You do not have permission to {action.replace("_", " ")} tasks.'
                if action in {'update', 'partial_update'} and 'patient' in request.data:
                    audit_event('task_patient_link_change_denied', 'Task', getattr(view, 'kwargs', {}).get('pk', ''),
                                request=request, success=False, failure_reason='permission denied', source_module='tasks')
                if action in {'create', 'claim', 'generate_next'}:
                    return deny_creation(request, 'Task', self.message)
                return False
        return True

    def has_object_permission(self, request, view, obj):
        task = parent_task(obj)
        if request.method == 'DELETE':
            return is_admin(request.user)
        if request.method in SAFE_METHODS:
            return user_can_see_task(request.user, task)
        if getattr(view, 'action', None) in {'admin_override', 'dismiss'}:
            return is_admin(request.user)
        if getattr(view, 'action', None) in {'update', 'partial_update', 'destroy', 'reassign', 'claim', 'generate_next'}:
            return is_admin(request.user)
        return user_can_work_task(request.user, task)


class CanManageChecklistTemplates(BasePermission):
    message = TASK_CREATION_MESSAGE

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        if not has_permission(request.user, 'tasks.create'):
            return deny_creation(request, 'ChecklistTemplate')
        return True
