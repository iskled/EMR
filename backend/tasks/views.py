from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from core.audit_service import audit_event
from core.audit import AuditLogMixin
from .models import (
    ChecklistTemplate,
    Task,
    TaskAlert,
    TaskAssignmentHistory,
    TaskAttachment,
    TaskChecklistItem,
    TaskComment,
    TaskDependency,
    TaskNotification,
)
from .permissions import CanManageChecklistTemplates, CanManageTasks
from .serializers import (
    ChecklistTemplateSerializer,
    StaffSerializer,
    TaskAlertSerializer,
    TaskAttachmentSerializer,
    TaskChecklistItemSerializer,
    TaskCommentSerializer,
    TaskDependencySerializer,
    TaskNotificationSerializer,
    TaskSerializer,
)

User = get_user_model()


class TaskViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [CanManageTasks]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'status', 'priority', 'task_type', 'assigned_user', 'assigned_role',
        'patient', 'appointment', 'orthodontic_case', 'orthodontic_visit',
        'inventory_item', 'inventory_alert', 'due_date',
    ]
    search_fields = ['title', 'description', 'patient__first_name', 'patient__last_name']
    ordering_fields = ['due_date', 'due_time', 'priority', 'status', 'created_at', 'updated_at']
    ordering = ['status', 'due_date', '-created_at']

    def get_queryset(self):
        user = self.request.user
        qs = Task.objects.select_related(
            'assigned_user', 'created_by', 'patient', 'appointment__patient',
            'orthodontic_case__patient', 'orthodontic_visit', 'inventory_item', 'inventory_alert',
        ).prefetch_related(
            'watchers', 'checklist_items', 'dependencies__depends_on',
            'comments__author', 'alerts', 'assignment_history',
        )
        if user.role == 'admin' or user.is_superuser:
            return qs
        return qs.filter(assigned_user=user).distinct()

    def perform_create(self, serializer):
        assigned_user = serializer.validated_data.get('assigned_user')
        status_value = 'pending_acceptance' if assigned_user else serializer.validated_data.get('status', 'not_started')
        instance = serializer.save(created_by=self.request.user, status=status_value)
        self._log(self.request, 'create', instance)
        self._record_assignment(instance, None, '', instance.assigned_user, instance.assigned_role, 'Task created')
        self._notify_assignment(instance, 'task_assigned')

    def _record_assignment(self, task, from_user, from_role, to_user, to_role, notes=''):
        TaskAssignmentHistory.objects.create(
            task=task,
            from_user=from_user,
            from_role=from_role or '',
            to_user=to_user,
            to_role=to_role or '',
            changed_by=self.request.user,
            notes=notes,
        )

    def _admin_recipients(self):
        return User.objects.filter(is_active=True, role='admin')

    def _notify(self, task, recipient, notification_type, title, message):
        if not recipient:
            return None
        return TaskNotification.objects.create(
            task=task,
            recipient=recipient,
            actor=self.request.user,
            notification_type=notification_type,
            title=title,
            message=message,
        )

    def _notify_assignment(self, task, notification_type='task_assigned'):
        if task.assigned_user:
            label = 'assigned' if notification_type == 'task_assigned' else 'reassigned'
            self._notify(
                task,
                task.assigned_user,
                notification_type,
                f'New Task Assigned: {task.title}',
                f'Assigned by {self.request.user.get_full_name() or self.request.user.email}.',
            )

    def _notify_admins(self, task, notification_type, title, message):
        for admin in self._admin_recipients():
            if admin.id != self.request.user.id:
                self._notify(task, admin, notification_type, title, message)

    def perform_update(self, serializer):
        task = self.get_object()
        previous = {
            'status': task.status,
            'assigned_user': task.assigned_user_id,
            'assigned_role': task.assigned_role,
        }
        instance = serializer.save()
        current = {
            'status': instance.status,
            'assigned_user': instance.assigned_user_id,
            'assigned_role': instance.assigned_role,
        }
        if previous != current:
            audit_event(
                'task_status_change',
                'Task',
                instance.pk,
                request=self.request,
                patient_id=instance.patient_id,
                previous_values=previous,
                new_values=current,
                source_module='tasks',
            )
        if previous['status'] != instance.status:
            if instance.status == 'blocked':
                self._notify_admins(instance, 'task_blocked', f'Task Blocked: {instance.title}', 'Task was marked blocked.')
            if instance.status == 'completed':
                self._notify_admins(instance, 'task_completed', f'Task Completed: {instance.title}', 'Task was completed.')
        if previous['assigned_user'] != instance.assigned_user_id:
            self._record_assignment(instance, task.assigned_user, task.assigned_role, instance.assigned_user, instance.assigned_role, 'Task edited')
            self._notify_assignment(instance, 'task_reassigned')

    @action(detail=False, methods=['get'])
    def staff(self, request):
        qs = User.objects.filter(is_active=True).order_by('role', 'first_name', 'email')
        return Response(StaffSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def metrics(self, request):
        qs = self.get_queryset()
        today = timezone.localdate()
        visible = list(qs.filter(status__in=Task.OPEN_STATUSES)[:100])
        for task in visible[:100]:
            task.generate_alerts()
        data = {
            'total_open': qs.filter(status__in=Task.OPEN_STATUSES).count(),
            'my_tasks': qs.filter(assigned_user=request.user, status__in=Task.OPEN_STATUSES).count(),
            'team_tasks': qs.filter(assigned_role=request.user.role, status__in=Task.OPEN_STATUSES).count(),
            'pending_acceptance': qs.filter(status='pending_acceptance').count(),
            'accepted': qs.filter(status='accepted').count(),
            'in_progress': qs.filter(status='in_progress').count(),
            'due_today': qs.filter(due_date=today, status__in=Task.OPEN_STATUSES).count(),
            'due_this_week': qs.filter(due_date__gte=today, due_date__lte=today + timedelta(days=7), status__in=Task.OPEN_STATUSES).count(),
            'overdue': qs.filter(due_date__lt=today, status__in=Task.OPEN_STATUSES).count(),
            'urgent': qs.filter(priority='urgent', status__in=Task.OPEN_STATUSES).count(),
            'blocked': qs.filter(status='blocked').count(),
            'completed': qs.filter(status='completed').count(),
            'completed_today': qs.filter(status='completed', completed_at__date=today).count(),
            'unassigned': qs.filter(assigned_user__isnull=True, assigned_role='', status__in=Task.OPEN_STATUSES).count(),
            'my_pending_acceptance': qs.filter(assigned_user=request.user, status='pending_acceptance').count(),
            'my_accepted': qs.filter(assigned_user=request.user, status='accepted').count(),
            'my_active': qs.filter(assigned_user=request.user, status__in=['accepted', 'in_progress', 'waiting', 'blocked', 'overdue']).count(),
            'my_completed': qs.filter(assigned_user=request.user, status='completed').count(),
            'my_overdue': qs.filter(assigned_user=request.user, due_date__lt=today, status__in=Task.OPEN_STATUSES).count(),
            'unread_notifications': TaskNotification.objects.filter(recipient=request.user, is_read=False).count(),
            'clinical_tasks': qs.filter(task_type__in=['clinical', 'orthodontic'], status__in=Task.OPEN_STATUSES).count(),
            'administrative_tasks': qs.filter(task_type='administrative', status__in=Task.OPEN_STATUSES).count(),
            'by_status': list(qs.values('status').annotate(count=Count('id')).order_by('status')),
            'by_type': list(qs.values('task_type').annotate(count=Count('id')).order_by('task_type')),
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def notifications(self, request):
        notifications = TaskNotification.objects.filter(recipient=request.user).select_related('task', 'actor')[:50]
        return Response(TaskNotificationSerializer(notifications, many=True).data)

    @action(detail=False, methods=['post'], url_path=r'notifications/(?P<notification_id>[0-9]+)/read')
    def read_notification(self, request, notification_id=None):
        notification = TaskNotification.objects.select_related('task').filter(
            id=notification_id,
            recipient=request.user,
        ).first()
        if not notification:
            return Response({'error': 'Notification not found.'}, status=404)
        notification.mark_read(user=request.user)
        return Response(TaskNotificationSerializer(notification).data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        task = self.get_object()
        if task.assigned_user_id != request.user.id:
            return Response({'error': 'Only the assigned user can accept this task.'}, status=403)
        if task.status != 'pending_acceptance':
            return Response({'error': 'Only pending acceptance tasks can be accepted.'}, status=400)
        previous = {'status': task.status}
        task.status = 'accepted'
        task.accepted_at = timezone.now()
        task.save(update_fields=['status', 'accepted_at', 'updated_at'])
        task.notifications.filter(recipient=request.user, is_read=False).update(is_read=True, read_at=timezone.now())
        audit_event('task_accept', 'Task', task.pk, request=request, patient_id=task.patient_id, previous_values=previous, new_values={'status': task.status}, source_module='tasks')
        self._notify_admins(task, 'task_accepted', f'Task Accepted: {task.title}', f'{request.user.get_full_name() or request.user.email} accepted the task.')
        return Response(TaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        task = self.get_object()
        if task.assigned_user_id != request.user.id:
            return Response({'error': 'Only the assigned user can decline this task.'}, status=403)
        if task.status != 'pending_acceptance':
            return Response({'error': 'Only pending acceptance tasks can be declined.'}, status=400)
        reason = (request.data.get('reason') or '').strip()
        previous = {'status': task.status, 'assigned_user': task.assigned_user_id}
        task.status = 'cancelled'
        task.declined_at = timezone.now()
        task.decline_reason = reason
        task.save(update_fields=['status', 'declined_at', 'decline_reason', 'updated_at'])
        audit_event('task_decline', 'Task', task.pk, request=request, patient_id=task.patient_id, previous_values=previous, new_values={'status': task.status, 'decline_reason': reason}, source_module='tasks')
        self._notify_admins(task, 'task_declined', f'Task Declined: {task.title}', reason or 'Task was declined by the assignee.')
        return Response(TaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def claim(self, request, pk=None):
        task = self.get_object()
        old_user = task.assigned_user
        old_role = task.assigned_role
        task.assigned_user = request.user
        task.assigned_role = ''
        task.status = 'pending_acceptance'
        task.save(update_fields=['assigned_user', 'assigned_role', 'status', 'updated_at'])
        self._record_assignment(task, old_user, old_role, request.user, '', 'Claimed task')
        audit_event('task_assignment', 'Task', task.pk, request=request, patient_id=task.patient_id, source_module='tasks', metadata={'to_user': request.user.email})
        return Response(TaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def reassign(self, request, pk=None):
        task = self.get_object()
        old_user = task.assigned_user
        old_role = task.assigned_role
        assigned_user = request.data.get('assigned_user') or None
        assigned_role = request.data.get('assigned_role') or ''
        if assigned_user and assigned_role:
            return Response({'error': 'Assign to either a user or a role, not both.'}, status=400)
        task.assigned_user_id = assigned_user
        task.assigned_role = assigned_role
        task.status = 'pending_acceptance' if assigned_user else 'not_started'
        task.save(update_fields=['assigned_user', 'assigned_role', 'status', 'updated_at'])
        self._record_assignment(task, old_user, old_role, task.assigned_user, assigned_role, request.data.get('notes', ''))
        audit_event('task_reassignment', 'Task', task.pk, request=request, patient_id=task.patient_id, source_module='tasks', metadata={'assigned_user': assigned_user, 'assigned_role': assigned_role})
        self._notify_assignment(task, 'task_reassigned')
        return Response(TaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        task = self.get_object()
        if not task.can_transition_to('completed', request.user):
            return Response({'error': 'This task must be accepted before it can be completed.'}, status=400)
        if not task.can_complete():
            return Response({'error': 'Required checklist items and dependencies must be completed first.'}, status=400)
        task.status = 'completed'
        task.completed_at = timezone.now()
        task.save(update_fields=['status', 'completed_at', 'updated_at'])
        task.alerts.filter(status='open').update(status='resolved')
        task.notifications.filter(recipient=request.user, is_read=False).update(is_read=True, read_at=timezone.now())
        next_task = task.generate_next_occurrence(user=request.user)
        audit_event('task_completion', 'Task', task.pk, request=request, patient_id=task.patient_id, source_module='tasks')
        self._notify_admins(task, 'task_completed', f'Task Completed: {task.title}', 'Task was completed.')
        payload = TaskSerializer(task, context={'request': request}).data
        payload['next_task_id'] = next_task.id if next_task else None
        return Response(payload)

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        previous = TaskSerializer(task, context={'request': request}).data
        audit_event('task_delete', 'Task', task.pk, request=request, patient_id=task.patient_id, previous_values=previous, source_module='tasks')
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='apply-template')
    def apply_template(self, request, pk=None):
        task = self.get_object()
        template_id = request.data.get('template')
        template = ChecklistTemplate.objects.prefetch_related('items').get(pk=template_id, is_active=True)
        created = []
        for item in template.items.all():
            checklist_item, was_created = TaskChecklistItem.objects.get_or_create(
                task=task,
                template_item=item,
                defaults={
                    'title': item.title,
                    'description': item.description,
                    'is_required': item.is_required,
                    'sort_order': item.sort_order,
                },
            )
            if was_created:
                created.append(checklist_item)
        return Response(TaskChecklistItemSerializer(created, many=True).data, status=201)

    @action(detail=True, methods=['post'], url_path='generate-next')
    def generate_next(self, request, pk=None):
        task = self.get_object()
        next_task = task.generate_next_occurrence(user=request.user)
        if not next_task:
            return Response({'error': 'No future recurrence could be generated.'}, status=400)
        audit_event('create', 'Task', next_task.pk, request=request, patient_id=next_task.patient_id, source_module='tasks', metadata={'system_generated': False, 'source_task': str(task.pk)})
        return Response(TaskSerializer(next_task, context={'request': request}).data, status=201)


class ChecklistTemplateViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = ChecklistTemplateSerializer
    permission_classes = [CanManageChecklistTemplates]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['task_type', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'task_type', 'created_at']

    def get_queryset(self):
        return ChecklistTemplate.objects.prefetch_related('items').select_related('created_by')

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        self._log(self.request, 'create', instance)


class TaskChecklistItemViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = TaskChecklistItemSerializer
    permission_classes = [CanManageTasks]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['task', 'is_completed', 'is_required']

    def get_queryset(self):
        return TaskChecklistItem.objects.select_related('task', 'completed_by', 'template_item')

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        item = self.get_object()
        item.is_completed = True
        item.completed_by = request.user
        item.completed_at = timezone.now()
        item.save(update_fields=['is_completed', 'completed_by', 'completed_at'])
        audit_event('task_checklist_completion', 'TaskChecklistItem', item.pk, request=request, patient_id=item.task.patient_id, source_module='tasks', metadata={'task_id': str(item.task_id)})
        return Response(TaskChecklistItemSerializer(item).data)


class TaskCommentViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = TaskCommentSerializer
    permission_classes = [CanManageTasks]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task']

    def get_queryset(self):
        return TaskComment.objects.select_related('task', 'author')

    def perform_create(self, serializer):
        instance = serializer.save(author=self.request.user)
        self._log(self.request, 'create', instance)


class TaskAttachmentViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = TaskAttachmentSerializer
    permission_classes = [CanManageTasks]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task']

    def get_queryset(self):
        return TaskAttachment.objects.select_related('task', 'uploaded_by')

    def perform_create(self, serializer):
        instance = serializer.save(uploaded_by=self.request.user)
        self._log(self.request, 'create', instance)


class TaskDependencyViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = TaskDependencySerializer
    permission_classes = [CanManageTasks]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task', 'depends_on']

    def get_queryset(self):
        return TaskDependency.objects.select_related('task', 'depends_on')


class TaskAlertViewSet(viewsets.ModelViewSet):
    serializer_class = TaskAlertSerializer
    permission_classes = [CanManageTasks]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['task', 'alert_type', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        return TaskAlert.objects.select_related('task')

    def _set_status(self, request, status_value):
        alert = self.get_object()
        alert.status = status_value
        if status_value == 'acknowledged':
            alert.acknowledged_by = request.user
            alert.acknowledged_at = timezone.now()
        if status_value == 'dismissed':
            alert.dismissed_by = request.user
            alert.dismissed_at = timezone.now()
        alert.save()
        return Response(TaskAlertSerializer(alert).data)

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        return self._set_status(request, 'acknowledged')

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        return self._set_status(request, 'dismissed')

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        return self._set_status(request, 'resolved')
