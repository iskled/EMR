from datetime import timedelta

import os
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class ChecklistTemplate(models.Model):
    TASK_TYPE_CHOICES = [
        ('administrative', 'Administrative'),
        ('clinical', 'Clinical'),
        ('orthodontic', 'Orthodontic'),
        ('appointment', 'Appointment'),
        ('inventory', 'Inventory'),
        ('patient_follow_up', 'Patient Follow-up'),
        ('recall', 'Recall'),
        ('document', 'Document'),
        ('maintenance', 'Maintenance'),
        ('compliance', 'Compliance'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=160)
    task_type = models.CharField(max_length=30, choices=TASK_TYPE_CHOICES, default='administrative', db_index=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_checklist_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'task_checklist_templates'
        ordering = ['task_type', 'name']
        indexes = [
            models.Index(fields=['task_type', 'is_active']),
        ]

    def __str__(self):
        return self.name


class ChecklistTemplateItem(models.Model):
    template = models.ForeignKey(ChecklistTemplate, on_delete=models.CASCADE, related_name='items')
    title = models.CharField(max_length=220)
    description = models.TextField(blank=True)
    is_required = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'task_checklist_template_items'
        ordering = ['sort_order', 'id']

    def __str__(self):
        return self.title


class Task(models.Model):
    TASK_TYPE_CHOICES = ChecklistTemplate.TASK_TYPE_CHOICES
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    STATUS_CHOICES = [
        ('pending_acceptance', 'Pending Acceptance'),
        ('accepted', 'Accepted'),
        ('in_progress', 'In Progress'),
        ('waiting_for_vendor', 'Waiting for Vendor'),
        ('waiting_for_staff', 'Waiting for Staff'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
        # Retained only so historical rows remain readable.
        ('not_started', 'Not Started (Legacy)'),
        ('waiting', 'Waiting (Legacy)'),
        ('blocked', 'Blocked (Legacy)'),
        ('awaiting_review', 'Awaiting Review (Legacy)'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('declined', 'Declined'),
        ('archived', 'Archived'),
        ('overdue', 'Overdue'),
    ]
    RECURRENCE_CHOICES = [
        ('none', 'None'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('custom', 'Custom'),
    ]
    OPEN_STATUSES = ['pending_acceptance', 'accepted', 'in_progress', 'waiting_for_vendor', 'waiting_for_staff', 'resolved', 'not_started', 'waiting', 'blocked', 'awaiting_review', 'overdue']
    TERMINAL_STATUSES = ['closed', 'completed', 'cancelled', 'declined', 'archived']
    EXECUTION_TRANSITIONS = {
        'pending_acceptance': {'accepted'},
        'accepted': {'in_progress'},
        'in_progress': {'accepted', 'waiting_for_vendor', 'waiting_for_staff', 'resolved'},
        'waiting_for_vendor': {'in_progress', 'waiting_for_staff', 'resolved'},
        'waiting_for_staff': {'in_progress', 'waiting_for_vendor', 'resolved'},
        'resolved': {'closed', 'in_progress', 'waiting_for_vendor', 'waiting_for_staff'},
        'closed': {'resolved'},
    }
    REVERSE_TRANSITIONS = {
        ('in_progress', 'accepted'), ('waiting_for_vendor', 'in_progress'),
        ('waiting_for_staff', 'in_progress'), ('resolved', 'in_progress'),
        ('resolved', 'waiting_for_vendor'), ('resolved', 'waiting_for_staff'),
        ('closed', 'resolved'),
    }

    title = models.CharField(max_length=220)
    description = models.TextField(blank=True)
    task_type = models.CharField(max_length=30, choices=TASK_TYPE_CHOICES, default='administrative', db_index=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal', db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started', db_index=True)

    assigned_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    assigned_role = models.CharField(max_length=20, blank=True, db_index=True)
    watchers = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='watched_tasks')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_tasks')

    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True, db_index=True)
    due_time = models.TimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    accepted_at = models.DateTimeField(null=True, blank=True)
    accepted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    started_at = models.DateTimeField(null=True, blank=True)
    started_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    declined_at = models.DateTimeField(null=True, blank=True)
    declined_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    decline_reason = models.TextField(blank=True)
    progress_percentage = models.PositiveSmallIntegerField(null=True, blank=True)
    latest_progress_summary = models.TextField(blank=True)
    waiting_reason = models.TextField(blank=True)
    waiting_resume_date = models.DateField(null=True, blank=True)
    blocked_reason = models.TextField(blank=True)
    blocker_owner = models.CharField(max_length=160, blank=True)
    blocked_resolution_date = models.DateField(null=True, blank=True)
    completion_summary = models.TextField(blank=True)

    recurrence = models.CharField(max_length=10, choices=RECURRENCE_CHOICES, default='none')
    recurrence_interval = models.PositiveSmallIntegerField(default=1)
    recurrence_weekdays = models.JSONField(default=list, blank=True)
    recurrence_end_date = models.DateField(null=True, blank=True)
    last_generated_at = models.DateTimeField(null=True, blank=True)
    parent_task = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='generated_tasks')

    patient = models.ForeignKey('patients.Patient', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    appointment = models.ForeignKey('appointments.Appointment', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    orthodontic_case = models.ForeignKey('clinical.OrthodonticCase', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    orthodontic_visit = models.ForeignKey('clinical.OrthodonticVisit', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    inventory_item = models.ForeignKey('inventory.InventoryItem', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    inventory_alert = models.ForeignKey('inventory.InventoryAlert', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')

    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tasks'
        ordering = ['status', 'due_date', 'priority', '-created_at']
        indexes = [
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['task_type', 'status']),
            models.Index(fields=['assigned_user', 'status']),
            models.Index(fields=['assigned_role', 'status']),
            models.Index(fields=['priority', 'due_date']),
            models.Index(fields=['patient', 'status']),
        ]

    def __str__(self):
        return self.title

    @property
    def is_overdue(self):
        return self.due_date and self.status in self.OPEN_STATUSES and self.due_date < timezone.localdate()

    def required_checklist_complete(self):
        return not self.checklist_items.filter(is_required=True, is_completed=False).exists()

    def dependencies_resolved(self):
        return not self.dependencies.exclude(depends_on__status__in=['completed', 'cancelled']).exists()

    def can_complete(self):
        return self.required_checklist_complete() and self.dependencies_resolved()

    def allowed_transitions(self, user):
        return self.EXECUTION_TRANSITIONS.get(self.status, set())

    def can_transition_to(self, status, user):
        if status == self.status:
            return True
        return status in self.allowed_transitions(user)

    def _next_due_date(self):
        if not self.due_date or self.recurrence == 'none':
            return None
        interval = max(self.recurrence_interval or 1, 1)
        if self.recurrence == 'daily':
            return self.due_date + timedelta(days=interval)
        if self.recurrence == 'weekly':
            return self.due_date + timedelta(weeks=interval)
        if self.recurrence == 'monthly':
            month = self.due_date.month - 1 + interval
            year = self.due_date.year + month // 12
            month = month % 12 + 1
            day = min(self.due_date.day, 28)
            return self.due_date.replace(year=year, month=month, day=day)
        if self.recurrence == 'custom':
            return self.due_date + timedelta(days=interval)
        return None

    def generate_next_occurrence(self, user=None):
        next_due = self._next_due_date()
        if not next_due or (self.recurrence_end_date and next_due > self.recurrence_end_date):
            return None
        existing = Task.objects.filter(parent_task=self, due_date=next_due).first()
        if existing:
            return existing
        next_task = Task.objects.create(
            title=self.title,
            description=self.description,
            task_type=self.task_type,
            priority=self.priority,
            assigned_user=self.assigned_user,
            assigned_role=self.assigned_role,
            created_by=user or self.created_by,
            start_date=next_due,
            due_date=next_due,
            due_time=self.due_time,
            status='pending_acceptance' if self.assigned_user_id else 'not_started',
            recurrence=self.recurrence,
            recurrence_interval=self.recurrence_interval,
            recurrence_weekdays=self.recurrence_weekdays,
            recurrence_end_date=self.recurrence_end_date,
            parent_task=self,
            patient=self.patient,
            appointment=self.appointment,
            orthodontic_case=self.orthodontic_case,
            orthodontic_visit=self.orthodontic_visit,
            inventory_item=self.inventory_item,
            inventory_alert=self.inventory_alert,
            tags=self.tags,
        )
        next_task.watchers.set(self.watchers.all())
        for item in self.checklist_items.all():
            TaskChecklistItem.objects.create(
                task=next_task,
                template_item=item.template_item,
                title=item.title,
                description=item.description,
                is_required=item.is_required,
                sort_order=item.sort_order,
            )
        self.last_generated_at = timezone.now()
        self.save(update_fields=['last_generated_at', 'updated_at'])
        return next_task

    def generate_alerts(self):
        alerts = []
        today = timezone.localdate()
        rules = []
        if not self.assigned_user_id and not self.assigned_role:
            rules.append(('unassigned', 'Task is not assigned.'))
        if self.status == 'blocked':
            rules.append(('blocked', 'Task is blocked.'))
        if self.priority == 'urgent' and self.status in self.OPEN_STATUSES:
            rules.append(('urgent', 'Urgent task needs attention.'))
        if self.due_date and self.status in self.OPEN_STATUSES:
            if self.due_date < today:
                rules.append(('overdue', 'Task is overdue.'))
            elif self.due_date <= today + timedelta(days=2):
                rules.append(('due_soon', 'Task is due soon.'))
        if self.status == 'awaiting_review' and not self.required_checklist_complete():
            rules.append(('checklist_incomplete', 'Required checklist items are incomplete.'))
        for alert_type, message in rules:
            alert, _ = TaskAlert.objects.get_or_create(
                task=self,
                alert_type=alert_type,
                status='open',
                defaults={'message': message},
            )
            alerts.append(alert)
        return alerts


class TaskAssignmentHistory(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='assignment_history')
    from_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    to_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    from_role = models.CharField(max_length=20, blank=True)
    to_role = models.CharField(max_length=20, blank=True)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    notes = models.TextField(blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_assignment_history'
        ordering = ['-changed_at']


class TaskComment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='task_comments')
    body = models.TextField()
    mentions = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_comments'
        ordering = ['created_at']


def task_attachment_path(instance, filename):
    extension = os.path.splitext(filename)[1].lower()
    return f'tasks/{instance.task_id}/attachments/{uuid.uuid4().hex}{extension}'


class TaskProgressUpdate(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='progress_updates')
    note = models.TextField()
    percentage = models.PositiveSmallIntegerField(null=True, blank=True)
    status_at_time = models.CharField(max_length=20, choices=Task.STATUS_CHOICES, db_index=True)
    event_type = models.CharField(max_length=40, default='note', db_index=True)
    previous_stage = models.CharField(max_length=20, blank=True)
    new_stage = models.CharField(max_length=20, blank=True)
    reason = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='task_progress_updates')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_progress_updates'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['task', 'created_at']),
        ]

    def __str__(self):
        return f'{self.task_id}: {self.status_at_time}'


class TaskAttachment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='attachments')
    progress_update = models.ForeignKey(TaskProgressUpdate, on_delete=models.CASCADE, null=True, blank=True, related_name='attachments')
    file = models.FileField(upload_to=task_attachment_path)
    title = models.CharField(max_length=180, blank=True)
    caption = models.TextField(blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    mime_type = models.CharField(max_length=120, blank=True)
    file_size = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='task_attachments')
    archived_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    archived_at = models.DateTimeField(null=True, blank=True)
    archive_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_attachments'
        ordering = ['-created_at']


class TaskChecklistItem(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='checklist_items')
    template_item = models.ForeignKey(ChecklistTemplateItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    title = models.CharField(max_length=220)
    description = models.TextField(blank=True)
    is_required = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_completed = models.BooleanField(default=False, db_index=True)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'task_checklist_items'
        ordering = ['sort_order', 'id']
        indexes = [
            models.Index(fields=['task', 'is_completed']),
        ]

    def __str__(self):
        return self.title


class TaskDependency(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='dependencies')
    depends_on = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='dependents')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_dependencies'
        unique_together = [('task', 'depends_on')]
        indexes = [
            models.Index(fields=['task', 'depends_on']),
        ]

    def __str__(self):
        return f'{self.task_id} depends on {self.depends_on_id}'


class TaskAlert(models.Model):
    ALERT_TYPE_CHOICES = [
        ('due_soon', 'Due Soon'),
        ('overdue', 'Overdue'),
        ('urgent', 'Urgent'),
        ('blocked', 'Blocked'),
        ('unassigned', 'Unassigned'),
        ('checklist_incomplete', 'Checklist Incomplete'),
        ('escalated', 'Escalated'),
    ]
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('acknowledged', 'Acknowledged'),
        ('dismissed', 'Dismissed'),
        ('resolved', 'Resolved'),
    ]

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='alerts')
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPE_CHOICES, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open', db_index=True)
    message = models.CharField(max_length=255)
    acknowledged_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    dismissed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    dismissed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'task_alerts'
        ordering = ['-created_at']
        unique_together = [('task', 'alert_type', 'status')]
        indexes = [
            models.Index(fields=['status', 'alert_type']),
            models.Index(fields=['task', 'status']),
        ]

    def __str__(self):
        return f'{self.alert_type}: {self.task}'


class TaskNotification(models.Model):
    NOTIFICATION_TYPES = [
        ('task_assigned', 'Task Assigned'),
        ('task_accepted', 'Task Accepted'),
        ('task_declined', 'Task Declined'),
        ('task_completed', 'Task Completed'),
        ('task_blocked', 'Task Blocked'),
        ('task_waiting', 'Task Waiting'),
        ('task_started', 'Task Started'),
        ('task_resumed', 'Task Resumed'),
        ('task_progress_update', 'Task Progress Update'),
        ('task_attachment_added', 'Task Attachment Added'),
        ('task_overdue', 'Task Overdue'),
        ('task_reassigned', 'Task Reassigned'),
        ('task_deleted', 'Task Deleted'),
    ]

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='task_notifications')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES, db_index=True)
    title = models.CharField(max_length=220)
    message = models.CharField(max_length=320)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['task', 'notification_type']),
        ]

    def mark_read(self, user=None):
        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=['is_read', 'read_at'])
