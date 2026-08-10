from datetime import timedelta

from django.contrib.auth import get_user_model
from django.http import FileResponse
from django.shortcuts import get_object_or_404
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
    TaskProgressUpdate,
)
from .permissions import CanManageChecklistTemplates, CanManageTasks, is_admin, user_can_see_task
from .serializers import (
    ChecklistTemplateSerializer,
    StaffSerializer,
    TaskAlertSerializer,
    TaskAttachmentSerializer,
    TaskChecklistItemSerializer,
    TaskCommentSerializer,
    TaskDependencySerializer,
    TaskNotificationSerializer,
    TaskProgressUpdateSerializer,
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
            'progress_updates__created_by',
        )
        if user.role == 'admin' or user.is_superuser:
            return qs
        return qs.filter(assigned_user=user).distinct()

    def perform_create(self, serializer):
        assigned_user = serializer.validated_data.get('assigned_user')
        status_value = 'pending_acceptance' if assigned_user else serializer.validated_data.get('status', 'not_started')
        instance = serializer.save(created_by=self.request.user, status=status_value,
                                   progress_percentage=Task.percentage_for_stage(status_value))
        self._log(self.request, 'create', instance)
        self._record_assignment(instance, None, '', instance.assigned_user, instance.assigned_role, 'Task created')
        self._notify_assignment(instance, 'task_assigned')
        if instance.patient_id:
            audit_event('task_patient_linked', 'Task', instance.pk, request=self.request, patient_id=instance.patient_id, source_module='tasks')

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
            'patient': str(task.patient_id) if task.patient_id else None,
        }
        instance = serializer.save()
        current = {
            'status': instance.status,
            'assigned_user': instance.assigned_user_id,
            'assigned_role': instance.assigned_role,
            'patient': str(instance.patient_id) if instance.patient_id else None,
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
        if previous['patient'] != current['patient']:
            audit_event('task_patient_link_changed', 'Task', instance.pk, request=self.request,
                        patient_id=instance.patient_id, previous_values={'patient': previous['patient']},
                        new_values={'patient': current['patient']}, source_module='tasks')
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
            'waiting_for_vendor': qs.filter(status='waiting_for_vendor').count(),
            'waiting_for_staff': qs.filter(status='waiting_for_staff').count(),
            'resolved': qs.filter(status='resolved').count(),
            'closed_today': qs.filter(status='closed', completed_at__date=today).count(),
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
            'my_active': qs.filter(assigned_user=request.user, status__in=['accepted', 'in_progress', 'waiting_for_vendor', 'waiting_for_staff', 'resolved']).count(),
            'my_in_progress': qs.filter(assigned_user=request.user, status='in_progress').count(),
            'my_waiting_for_vendor': qs.filter(assigned_user=request.user, status='waiting_for_vendor').count(),
            'my_waiting_for_staff': qs.filter(assigned_user=request.user, status='waiting_for_staff').count(),
            'my_resolved': qs.filter(assigned_user=request.user, status='resolved').count(),
            'my_closed_today': qs.filter(assigned_user=request.user, status='closed', completed_at__date=today).count(),
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
        if is_admin(request.user):
            return Response({'error': 'Administrators cannot use the normal staff Accept action.'}, status=403)
        if task.assigned_user_id != request.user.id:
            return Response({'error': 'Only the assigned user can accept this task.'}, status=403)
        if task.status != 'pending_acceptance':
            return Response({'error': 'Only pending acceptance tasks can be accepted.'}, status=400)
        previous = {'status': task.status}
        task.status = 'accepted'
        task.progress_percentage = Task.percentage_for_stage('accepted')
        task.accepted_at = timezone.now()
        task.accepted_by = request.user
        task.save(update_fields=['status', 'progress_percentage', 'accepted_at', 'accepted_by', 'updated_at'])
        task.notifications.filter(recipient=request.user, is_read=False).update(is_read=True, read_at=timezone.now())
        audit_event('task_accept', 'Task', task.pk, request=request, patient_id=task.patient_id, previous_values=previous, new_values={'status': task.status}, source_module='tasks')
        self._append_progress(task, request.user, 'Task accepted.', task.progress_percentage, 'accepted', 'pending_acceptance', 'accepted')
        self._notify_admins(task, 'task_accepted', f'Task Accepted: {task.title}', f'{request.user.get_full_name() or request.user.email} accepted the task.')
        return Response(TaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        task = self.get_object()
        if is_admin(request.user):
            return Response({'error': 'Administrators cannot use the normal staff Decline action.'}, status=403)
        if task.assigned_user_id != request.user.id:
            return Response({'error': 'Only the assigned user can decline this task.'}, status=403)
        if task.status != 'pending_acceptance':
            return Response({'error': 'Only pending acceptance tasks can be declined.'}, status=400)
        reason = (request.data.get('reason') or '').strip()
        previous = {'status': task.status, 'assigned_user': task.assigned_user_id}
        if not reason:
            return Response({'reason': 'Decline reason is required.'}, status=400)
        task.status = 'declined'
        task.declined_at = timezone.now()
        task.declined_by = request.user
        task.decline_reason = reason
        task.save(update_fields=['status', 'declined_at', 'declined_by', 'decline_reason', 'updated_at'])
        audit_event('task_decline', 'Task', task.pk, request=request, patient_id=task.patient_id, previous_values=previous, new_values={'status': task.status, 'decline_reason': reason}, source_module='tasks')
        self._append_progress(task, request.user, f'Task declined: {reason}', None, 'declined', 'pending_acceptance', 'declined', reason)
        self._notify_admins(task, 'task_declined', f'Task Declined: {task.title}', reason or 'Task was declined by the assignee.')
        return Response(TaskSerializer(task, context={'request': request}).data)

    def _transition_task(self, request, task, new_status, note='', percentage=None, update_fields=None, admin_override=False, reason=''):
        if is_admin(request.user) and not admin_override:
            return Response({'error': 'Administrators must use the explicitly audited administrative override.'}, status=403)
        if not is_admin(request.user) and task.assigned_user_id != request.user.id:
            return Response({'error': 'Only the assigned non-admin staff member may change execution stages.'}, status=403)
        if not task.can_transition_to(new_status, request.user):
            return Response({'status': f'Cannot change task status from {task.get_status_display()} to {dict(Task.STATUS_CHOICES).get(new_status, new_status)}.'}, status=400)
        previous_stage = task.status
        reverse = (previous_stage, new_status) in Task.REVERSE_TRANSITIONS
        required_note = new_status in {'waiting_for_vendor', 'waiting_for_staff', 'resolved', 'closed'} or reverse
        if required_note and not (note or '').strip():
            return Response({'note': 'A progress note is required for this stage change.'}, status=400)
        if reverse and not (reason or '').strip():
            return Response({'reason': 'A reason is required for reverse transitions.'}, status=400)
        if admin_override and not (reason or '').strip():
            return Response({'reason': 'An administrative override reason is required.'}, status=400)
        previous = {'status': previous_stage, 'progress_percentage': task.progress_percentage}
        task.status = new_status
        task.progress_percentage = Task.percentage_for_stage(new_status)
        if update_fields:
            for field, value in update_fields.items():
                setattr(task, field, value)
        if note:
            task.latest_progress_summary = note
        fields = ['status', 'progress_percentage', 'latest_progress_summary', 'updated_at']
        if update_fields:
            fields.extend(update_fields.keys())
        task.save(update_fields=list(dict.fromkeys(fields)))
        event_type = 'admin_override' if admin_override else ('reversed' if reverse else 'stage_changed')
        update = self._append_progress(task, request.user, note or f'Status changed to {task.get_status_display()}.', task.progress_percentage, event_type, previous_stage, new_status, reason, previous['progress_percentage'])
        audit_event('task_admin_override' if admin_override else 'task_stage_change', 'Task', task.pk, request=request, patient_id=task.patient_id, previous_values=previous, new_values={'status': task.status, 'progress_percentage': task.progress_percentage}, source_module='tasks', metadata={'reason': reason, 'note': note, 'reverse': reverse})
        return update

    def _append_progress(self, task, user, note, percentage, event_type='note', previous_stage='', new_stage='', reason='', previous_percentage=None):
        update = TaskProgressUpdate.objects.create(
            task=task,
            note=note,
            percentage=percentage,
            status_at_time=task.status,
            created_by=user,
            event_type=event_type,
            previous_stage=previous_stage,
            new_stage=new_stage,
            previous_percentage=previous_percentage,
            new_percentage=percentage,
            reason=reason,
        )
        if percentage is not None:
            task.progress_percentage = percentage
        task.latest_progress_summary = note
        task.save(update_fields=['progress_percentage', 'latest_progress_summary', 'updated_at'])
        return update

    @action(detail=True, methods=['post'])
    def transition(self, request, pk=None):
        task = self.get_object()
        new_stage = (request.data.get('stage') or '').strip()
        if not new_stage:
            return Response({'stage': 'Target stage is required.'}, status=400)
        result = self._transition_task(
            request, task, new_stage, (request.data.get('note') or '').strip(),
            task.progress_percentage, reason=(request.data.get('reason') or '').strip(),
        )
        if isinstance(result, Response):
            return result
        if new_stage == 'in_progress' and not task.started_at:
            task.started_at, task.started_by = timezone.now(), request.user
            task.save(update_fields=['started_at', 'started_by', 'updated_at'])
        if new_stage == 'closed':
            task.completed_at, task.completed_by, task.progress_percentage = timezone.now(), request.user, 100
            task.save(update_fields=['completed_at', 'completed_by', 'progress_percentage', 'updated_at'])
        if new_stage in {'waiting_for_vendor', 'waiting_for_staff', 'resolved', 'closed'} or (result.previous_stage, result.new_stage) in Task.REVERSE_TRANSITIONS:
            self._notify_admins(task, f'task_{new_stage}', f'Task {task.get_status_display()}: {task.title}', result.note)
        task.refresh_from_db()
        return Response(TaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='admin-override')
    def admin_override(self, request, pk=None):
        if not is_admin(request.user):
            return Response({'error': 'Only administrators may override task state.'}, status=403)
        task = self.get_object()
        result = self._transition_task(request, task, (request.data.get('stage') or '').strip(), (request.data.get('note') or '').strip(), task.progress_percentage, admin_override=True, reason=(request.data.get('reason') or '').strip())
        if isinstance(result, Response):
            return result
        if task.assigned_user:
            self._notify(task, task.assigned_user, 'task_admin_override', f'Task Reopened: {task.title}', result.note)
        return Response(TaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='start-work')
    def start_work(self, request, pk=None):
        task = self.get_object()
        now = timezone.now()
        result = self._transition_task(
            request,
            task,
            'in_progress',
            request.data.get('note') or 'Work started.',
            task.progress_percentage if task.progress_percentage is not None else 0,
            {'started_at': now, 'started_by': request.user},
        )
        if isinstance(result, Response):
            return result
        self._notify_admins(task, 'task_started', f'Task Started: {task.title}', 'Task work has started.')
        return Response(TaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='mark-waiting')
    def mark_waiting(self, request, pk=None):
        task = self.get_object()
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'reason': 'Waiting reason is required.'}, status=400)
        percentage = request.data.get('percentage', task.progress_percentage)
        if percentage in ('', None):
            percentage = task.progress_percentage
        else:
            percentage = int(percentage)
            if percentage < 0 or percentage > 100:
                return Response({'percentage': 'Progress percentage must be between 0 and 100.'}, status=400)
        result = self._transition_task(
            request,
            task,
            'waiting',
            f'Waiting: {reason}',
            percentage,
            {'waiting_reason': reason, 'waiting_resume_date': request.data.get('expected_resume_date') or None},
        )
        if isinstance(result, Response):
            return result
        self._notify_admins(task, 'task_waiting', f'Task Waiting: {task.title}', reason)
        return Response(TaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='mark-blocked')
    def mark_blocked(self, request, pk=None):
        task = self.get_object()
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'reason': 'Blocking reason is required.'}, status=400)
        percentage = request.data.get('percentage', task.progress_percentage)
        if percentage in ('', None):
            percentage = task.progress_percentage
        else:
            percentage = int(percentage)
            if percentage < 0 or percentage > 100:
                return Response({'percentage': 'Progress percentage must be between 0 and 100.'}, status=400)
        result = self._transition_task(
            request,
            task,
            'blocked',
            f'Blocked: {reason}',
            percentage,
            {
                'blocked_reason': reason,
                'blocker_owner': request.data.get('blocker_owner') or '',
                'blocked_resolution_date': request.data.get('expected_resolution_date') or None,
            },
        )
        if isinstance(result, Response):
            return result
        self._notify_admins(task, 'task_blocked', f'Task Blocked: {task.title}', reason)
        return Response(TaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        task = self.get_object()
        result = self._transition_task(request, task, 'in_progress', request.data.get('note') or 'Task resumed.', task.progress_percentage)
        if isinstance(result, Response):
            return result
        self._notify_admins(task, 'task_resumed', f'Task Resumed: {task.title}', 'Task work has resumed.')
        return Response(TaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='progress-updates')
    def progress_updates(self, request, pk=None):
        task = self.get_object()
        if is_admin(request.user) or task.assigned_user_id != request.user.id:
            return Response({'error': 'Only the assigned non-admin staff member may add progress updates.'}, status=403)
        note = (request.data.get('note') or '').strip()
        if 'percentage' in request.data:
            return Response({'percentage': 'Completion percentage is calculated automatically from the task stage.'}, status=400)
        if not note:
            return Response({'note': 'Progress note is required.'}, status=400)
        percentage = Task.percentage_for_stage(task.status)
        update = self._append_progress(task, request.user, note, percentage)
        audit_event('task_progress_update', 'Task', task.pk, request=request, patient_id=task.patient_id, source_module='tasks', metadata={'progress_update_id': update.pk, 'percentage': percentage})
        return Response(TaskProgressUpdateSerializer(update, context={'request': request}).data, status=201)

    @action(detail=True, methods=['post'])
    def claim(self, request, pk=None):
        task = self.get_object()
        old_user = task.assigned_user
        old_role = task.assigned_role
        task.assigned_user = request.user
        task.assigned_role = ''
        task.status = 'pending_acceptance'
        task.progress_percentage = 0
        task.save(update_fields=['assigned_user', 'assigned_role', 'status', 'progress_percentage', 'updated_at'])
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
        task.progress_percentage = Task.percentage_for_stage(task.status)
        task.save(update_fields=['assigned_user', 'assigned_role', 'status', 'progress_percentage', 'updated_at'])
        self._record_assignment(task, old_user, old_role, task.assigned_user, assigned_role, request.data.get('notes', ''))
        audit_event('task_reassignment', 'Task', task.pk, request=request, patient_id=task.patient_id, source_module='tasks', metadata={'assigned_user': assigned_user, 'assigned_role': assigned_role})
        self._notify_assignment(task, 'task_reassigned')
        return Response(TaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        task = self.get_object()
        if task.status != 'in_progress':
            return Response({'status': 'Task must be In Progress before it can be completed.'}, status=400)
        summary = (request.data.get('summary') or '').strip()
        if not summary:
            return Response({'summary': 'Completion summary is required.'}, status=400)
        if not task.can_transition_to('completed', request.user):
            return Response({'error': 'This task must be accepted before it can be completed.'}, status=400)
        if not task.can_complete():
            return Response({'error': 'Task dependencies must be completed first.'}, status=400)
        task.status = 'completed'
        task.completed_at = timezone.now()
        task.completed_by = request.user
        task.progress_percentage = 100
        task.completion_summary = summary
        task.latest_progress_summary = summary
        task.save(update_fields=['status', 'completed_at', 'completed_by', 'progress_percentage', 'completion_summary', 'latest_progress_summary', 'updated_at'])
        self._append_progress(task, request.user, f'Completed: {summary}', 100)
        task.alerts.filter(status='open').update(status='resolved')
        task.notifications.filter(recipient=request.user, is_read=False).update(is_read=True, read_at=timezone.now())
        next_task = task.generate_next_occurrence(user=request.user)
        audit_event('task_completion', 'Task', task.pk, request=request, patient_id=task.patient_id, source_module='tasks')
        self._notify_admins(task, 'task_completed', f'Task Completed: {task.title}', summary)
        payload = TaskSerializer(task, context={'request': request}).data
        payload['next_task_id'] = next_task.id if next_task else None
        return Response(payload)

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'reason': 'Deletion reason is required.'}, status=400)
        protected_history = task.progress_updates.count() + task.attachments.filter(archived_at__isnull=True).count()
        if protected_history and request.data.get('confirmation') != task.title:
            return Response({'confirmation': 'Type the exact task title to delete a task containing notes or pictures.'}, status=400)
        previous = TaskSerializer(task, context={'request': request}).data
        audit_event('task_delete', 'Task', task.pk, request=request, patient_id=task.patient_id, previous_values=previous, source_module='tasks', metadata={'reason': reason, 'notes': task.progress_updates.count(), 'pictures': task.attachments.count()})
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'], url_path='deletion-impact')
    def deletion_impact(self, request, pk=None):
        if not is_admin(request.user):
            return Response({'error': 'Only administrators may inspect deletion impact.'}, status=403)
        task = self.get_object()
        linked = [name for name in ('patient', 'appointment', 'orthodontic_case', 'orthodontic_visit', 'inventory_item', 'inventory_alert') if getattr(task, f'{name}_id', None)]
        return Response({'title': task.title, 'assignee': task.assigned_user.get_full_name() or task.assigned_user.email if task.assigned_user else '', 'stage': task.status, 'notes': task.progress_updates.count(), 'pictures': task.attachments.filter(archived_at__isnull=True).count(), 'linked_records': linked, 'typed_confirmation_required': task.progress_updates.exists() or task.attachments.exists()})

    @action(detail=True, methods=['post'], url_path='apply-template')
    def apply_template(self, request, pk=None):
        if not is_admin(request.user):
            audit_event('task_checklist_access_denied', 'Task', pk, request=request, success=False, failure_reason='permission denied', source_module='tasks')
            return Response({'detail': 'Only administrators can manage task checklists.'}, status=403)
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
        qs = TaskChecklistItem.objects.select_related('task', 'completed_by', 'template_item')
        return qs if is_admin(self.request.user) else qs.none()

    def _admin_only(self, request):
        if is_admin(request.user):
            return None
        audit_event('task_checklist_access_denied', 'TaskChecklistItem', request=request, success=False, failure_reason='permission denied', source_module='tasks')
        return Response({'detail': 'Only administrators can manage task checklists.'}, status=403)

    def create(self, request, *args, **kwargs):
        denied = self._admin_only(request)
        return denied or super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        denied = self._admin_only(request)
        return denied or super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        denied = self._admin_only(request)
        return denied or super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        denied = self._admin_only(request)
        return denied or super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        denied = self._admin_only(request)
        if denied is not None:
            return denied
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
        qs = TaskAttachment.objects.select_related('task', 'uploaded_by', 'progress_update')
        user = self.request.user
        if user.role == 'admin' or user.is_superuser:
            return qs
        return qs.filter(task__assigned_user=user, archived_at__isnull=True)

    def create(self, request, *args, **kwargs):
        audit_event('task_attachment_upload_denied', 'TaskAttachment', request=request, success=False,
                    failure_reason='Task attachments are retired', source_module='tasks')
        return Response({'detail': 'Task attachment uploads have been retired.'}, status=410)

    def _secure_attachment(self, request, pk):
        attachment = get_object_or_404(TaskAttachment.objects.select_related('task'), pk=pk, archived_at__isnull=True)
        if not user_can_see_task(request.user, attachment.task):
            audit_event('task_attachment_access_denied', 'TaskAttachment', attachment.pk, request=request,
                        success=False, failure_reason='permission denied', source_module='tasks',
                        metadata={'task_id': attachment.task_id})
            return None, Response({'detail': 'You do not have permission to access this attachment.'}, status=403)
        return attachment, None

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        attachment, denied = self._secure_attachment(request, pk)
        if denied is not None:
            return denied
        audit_event('task_attachment_download', 'TaskAttachment', attachment.pk, request=request, patient_id=attachment.task.patient_id, source_module='tasks')
        response = FileResponse(attachment.file.open('rb'), content_type=attachment.mime_type or 'application/octet-stream')
        filename = attachment.original_filename or attachment.file.name.split('/')[-1]
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        attachment, denied = self._secure_attachment(request, pk)
        if denied:
            return denied
        if attachment.mime_type not in {'image/jpeg', 'image/png', 'image/webp'}:
            return Response({'detail': 'Preview is unavailable for this file type.'}, status=415)
        audit_event('task_attachment_preview', 'TaskAttachment', attachment.pk, request=request, patient_id=attachment.task.patient_id, source_module='tasks')
        response = FileResponse(attachment.file.open('rb'), content_type=attachment.mime_type)
        response['Content-Disposition'] = f'inline; filename="{attachment.original_filename or "task-image"}"'
        response['Cache-Control'] = 'private, no-store'
        return response

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        attachment = self.get_object()
        if request.user.role != 'admin' and not request.user.is_superuser:
            return Response({'detail': 'Only administrators can archive task attachments.'}, status=403)
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'reason': 'Archive reason is required.'}, status=400)
        attachment.archived_at = timezone.now()
        attachment.archived_by = request.user
        attachment.archive_reason = reason
        attachment.save(update_fields=['archived_at', 'archived_by', 'archive_reason'])
        audit_event('task_attachment_archive', 'TaskAttachment', attachment.pk, request=request, patient_id=attachment.task.patient_id, source_module='tasks', metadata={'task_id': attachment.task_id, 'reason': reason})
        return Response(TaskAttachmentSerializer(attachment, context={'request': request}).data)


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
        if status_value == 'dismissed' and not is_admin(request.user):
            return Response({'detail': 'Only administrators may clear task alerts.'}, status=403)
        previous_status = alert.status
        alert.status = status_value
        if status_value == 'acknowledged':
            alert.acknowledged_by = request.user
            alert.acknowledged_at = timezone.now()
        if status_value == 'dismissed':
            alert.dismissed_by = request.user
            alert.dismissed_at = timezone.now()
        alert.save()
        audit_event(
            'task_alert_cleared' if status_value == 'dismissed' else 'task_alert_status_changed',
            'TaskAlert', alert.pk, request=request, patient_id=alert.task.patient_id,
            previous_values={'status': previous_status}, new_values={'status': status_value},
            source_module='tasks', metadata={'task_id': alert.task_id, 'alert_type': alert.alert_type},
        )
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
