from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
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
        return qs.filter(
            Q(created_by=user)
            | Q(assigned_user=user)
            | Q(assigned_role=user.role)
            | Q(watchers=user)
        ).distinct()

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        self._log(self.request, 'create', instance)

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
            'due_today': qs.filter(due_date=today, status__in=Task.OPEN_STATUSES).count(),
            'due_this_week': qs.filter(due_date__gte=today, due_date__lte=today + timedelta(days=7), status__in=Task.OPEN_STATUSES).count(),
            'overdue': qs.filter(due_date__lt=today, status__in=Task.OPEN_STATUSES).count(),
            'urgent': qs.filter(priority='urgent', status__in=Task.OPEN_STATUSES).count(),
            'blocked': qs.filter(status='blocked').count(),
            'completed': qs.filter(status='completed').count(),
            'unassigned': qs.filter(assigned_user__isnull=True, assigned_role='', status__in=Task.OPEN_STATUSES).count(),
            'clinical_tasks': qs.filter(task_type__in=['clinical', 'orthodontic'], status__in=Task.OPEN_STATUSES).count(),
            'administrative_tasks': qs.filter(task_type='administrative', status__in=Task.OPEN_STATUSES).count(),
            'by_status': list(qs.values('status').annotate(count=Count('id')).order_by('status')),
            'by_type': list(qs.values('task_type').annotate(count=Count('id')).order_by('task_type')),
        }
        return Response(data)

    @action(detail=True, methods=['post'])
    def claim(self, request, pk=None):
        task = self.get_object()
        old_user = task.assigned_user
        old_role = task.assigned_role
        task.assigned_user = request.user
        task.assigned_role = ''
        task.save(update_fields=['assigned_user', 'assigned_role', 'updated_at'])
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
        task.save(update_fields=['assigned_user', 'assigned_role', 'updated_at'])
        self._record_assignment(task, old_user, old_role, task.assigned_user, assigned_role, request.data.get('notes', ''))
        audit_event('task_reassignment', 'Task', task.pk, request=request, patient_id=task.patient_id, source_module='tasks', metadata={'assigned_user': assigned_user, 'assigned_role': assigned_role})
        return Response(TaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        task = self.get_object()
        if not task.can_complete():
            return Response({'error': 'Required checklist items and dependencies must be completed first.'}, status=400)
        task.status = 'completed'
        task.completed_at = timezone.now()
        task.save(update_fields=['status', 'completed_at', 'updated_at'])
        task.alerts.filter(status='open').update(status='resolved')
        next_task = task.generate_next_occurrence(user=request.user)
        audit_event('task_completion', 'Task', task.pk, request=request, patient_id=task.patient_id, source_module='tasks')
        payload = TaskSerializer(task, context={'request': request}).data
        payload['next_task_id'] = next_task.id if next_task else None
        return Response(payload)

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
