from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from core.permissions import has_permission

from .models import (
    ChecklistTemplate,
    ChecklistTemplateItem,
    Task,
    TaskAlert,
    TaskAssignmentHistory,
    TaskAttachment,
    TaskChecklistItem,
    TaskComment,
    TaskDependency,
    TaskNotification,
)

User = get_user_model()


class StaffSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'name', 'role', 'is_active']

    def get_name(self, obj):
        return obj.get_full_name() or obj.email


class ChecklistTemplateItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistTemplateItem
        fields = ['id', 'title', 'description', 'is_required', 'sort_order']


class ChecklistTemplateSerializer(serializers.ModelSerializer):
    items = ChecklistTemplateItemSerializer(many=True, required=False)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistTemplate
        fields = [
            'id', 'name', 'task_type', 'description', 'is_active',
            'created_by', 'created_by_name', 'created_at', 'updated_at', 'items',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.email if obj.created_by else ''

    def create(self, validated_data):
        items = validated_data.pop('items', [])
        template = ChecklistTemplate.objects.create(**validated_data)
        for index, item in enumerate(items):
            item['sort_order'] = item.get('sort_order', index)
            ChecklistTemplateItem.objects.create(template=template, **item)
        return template

    def update(self, instance, validated_data):
        items = validated_data.pop('items', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if items is not None:
            instance.items.all().delete()
            for index, item in enumerate(items):
                item['sort_order'] = item.get('sort_order', index)
                ChecklistTemplateItem.objects.create(template=instance, **item)
        return instance


class TaskChecklistItemSerializer(serializers.ModelSerializer):
    completed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TaskChecklistItem
        fields = [
            'id', 'task', 'template_item', 'title', 'description',
            'is_required', 'sort_order', 'is_completed', 'completed_by',
            'completed_by_name', 'completed_at',
        ]
        read_only_fields = ['completed_by', 'completed_at']

    def get_completed_by_name(self, obj):
        return obj.completed_by.get_full_name() or obj.completed_by.email if obj.completed_by else ''


class TaskDependencySerializer(serializers.ModelSerializer):
    depends_on_title = serializers.CharField(source='depends_on.title', read_only=True)
    depends_on_status = serializers.CharField(source='depends_on.status', read_only=True)

    class Meta:
        model = TaskDependency
        fields = ['id', 'task', 'depends_on', 'depends_on_title', 'depends_on_status', 'created_at']
        read_only_fields = ['created_at']

    def validate(self, attrs):
        task = attrs.get('task') or self.instance.task
        depends_on = attrs.get('depends_on') or self.instance.depends_on
        if task == depends_on:
            raise serializers.ValidationError('A task cannot depend on itself.')
        return attrs


class TaskCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = TaskComment
        fields = ['id', 'task', 'author', 'author_name', 'body', 'mentions', 'created_at']
        read_only_fields = ['author', 'created_at']

    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.email if obj.author else ''


class TaskAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TaskAttachment
        fields = ['id', 'task', 'file', 'title', 'uploaded_by', 'uploaded_by_name', 'created_at']
        read_only_fields = ['uploaded_by', 'created_at']

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.email if obj.uploaded_by else ''


class TaskAlertSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source='task.title', read_only=True)

    class Meta:
        model = TaskAlert
        fields = [
            'id', 'task', 'task_title', 'alert_type', 'status', 'message',
            'acknowledged_by', 'acknowledged_at', 'dismissed_by', 'dismissed_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['acknowledged_by', 'acknowledged_at', 'dismissed_by', 'dismissed_at', 'created_at', 'updated_at']


class TaskNotificationSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source='task.title', read_only=True)
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = TaskNotification
        fields = [
            'id', 'recipient', 'actor', 'actor_name', 'task', 'task_title',
            'notification_type', 'title', 'message', 'is_read', 'read_at', 'created_at',
        ]
        read_only_fields = ['recipient', 'actor', 'read_at', 'created_at']

    def get_actor_name(self, obj):
        return obj.actor.get_full_name() or obj.actor.email if obj.actor else ''


class TaskAssignmentHistorySerializer(serializers.ModelSerializer):
    from_user_name = serializers.SerializerMethodField()
    to_user_name = serializers.SerializerMethodField()
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TaskAssignmentHistory
        fields = [
            'id', 'task', 'from_user', 'from_user_name', 'to_user', 'to_user_name',
            'from_role', 'to_role', 'changed_by', 'changed_by_name', 'notes', 'changed_at',
        ]

    def get_from_user_name(self, obj):
        return obj.from_user.get_full_name() or obj.from_user.email if obj.from_user else ''

    def get_to_user_name(self, obj):
        return obj.to_user.get_full_name() or obj.to_user.email if obj.to_user else ''

    def get_changed_by_name(self, obj):
        return obj.changed_by.get_full_name() or obj.changed_by.email if obj.changed_by else ''


class TaskSerializer(serializers.ModelSerializer):
    assigned_role = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    recurrence_interval = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    assigned_user_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    appointment_label = serializers.SerializerMethodField()
    orthodontic_case_label = serializers.SerializerMethodField()
    inventory_item_name = serializers.SerializerMethodField()
    checklist_items = TaskChecklistItemSerializer(many=True, read_only=True)
    dependencies = TaskDependencySerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)
    alerts = TaskAlertSerializer(many=True, read_only=True)
    notifications = TaskNotificationSerializer(many=True, read_only=True)
    assignment_history = TaskAssignmentHistorySerializer(many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'task_type', 'priority', 'status',
            'assigned_user', 'assigned_user_name', 'assigned_role', 'watchers',
            'created_by', 'created_by_name', 'start_date', 'due_date', 'due_time',
            'completed_at', 'accepted_at', 'declined_at', 'decline_reason',
            'recurrence', 'recurrence_interval', 'recurrence_weekdays',
            'recurrence_end_date', 'last_generated_at', 'parent_task', 'patient',
            'patient_name', 'appointment', 'appointment_label', 'orthodontic_case',
            'orthodontic_case_label', 'orthodontic_visit', 'inventory_item',
            'inventory_item_name', 'inventory_alert', 'tags', 'created_at', 'updated_at',
            'is_overdue', 'checklist_items', 'dependencies', 'comments', 'alerts', 'notifications',
            'assignment_history',
        ]
        read_only_fields = [
            'created_by', 'completed_at', 'accepted_at', 'declined_at',
            'last_generated_at', 'created_at', 'updated_at',
        ]

    def get_assigned_user_name(self, obj):
        return obj.assigned_user.get_full_name() or obj.assigned_user.email if obj.assigned_user else ''

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.email if obj.created_by else ''

    def get_patient_name(self, obj):
        return obj.patient.full_name if obj.patient else ''

    def get_appointment_label(self, obj):
        if not obj.appointment:
            return ''
        return f'{obj.appointment.patient.full_name} - {obj.appointment.scheduled_date} {obj.appointment.start_time}'

    def get_orthodontic_case_label(self, obj):
        if not obj.orthodontic_case:
            return ''
        return f'{obj.orthodontic_case.patient.full_name} - {obj.orthodontic_case.stage}'

    def get_inventory_item_name(self, obj):
        return obj.inventory_item.name if obj.inventory_item else ''

    def validate(self, attrs):
        status = attrs.get('status', self.instance.status if self.instance else None)
        assigned_user = attrs.get('assigned_user', self.instance.assigned_user if self.instance else None)
        assigned_role = attrs.get('assigned_role', self.instance.assigned_role if self.instance else '')
        start_date = attrs.get('start_date', self.instance.start_date if self.instance else None)
        due_date = attrs.get('due_date', self.instance.due_date if self.instance else None)
        recurrence = attrs.get('recurrence', self.instance.recurrence if self.instance else 'none')
        recurrence_interval = attrs.get('recurrence_interval', self.instance.recurrence_interval if self.instance else None)
        recurrence_end_date = attrs.get('recurrence_end_date', self.instance.recurrence_end_date if self.instance else None)
        errors = {}

        if assigned_role is None:
            attrs['assigned_role'] = ''
            assigned_role = ''

        if assigned_user and assigned_role:
            errors['assigned_role'] = 'Assign to either a user or a role, not both.'
        if assigned_user and not assigned_user.is_active:
            errors['assigned_user'] = 'The selected assignee is inactive.'
        if assigned_role and assigned_role not in {'admin', 'dentist', 'assistant', 'receptionist'}:
            errors['assigned_role'] = 'Select a valid assignment role.'
        if status and status not in dict(Task.STATUS_CHOICES):
            errors['status'] = 'Select a valid task status.'
        if start_date and due_date and due_date < start_date:
            errors['due_date'] = 'Due date cannot be earlier than start date.'
        if recurrence not in dict(Task.RECURRENCE_CHOICES):
            errors['recurrence'] = 'Select a valid repeat pattern.'
        if recurrence == 'none':
            attrs.pop('recurrence_end_date', None)
            attrs['recurrence_interval'] = 1
        else:
            if not recurrence_interval or recurrence_interval < 1:
                errors['recurrence_interval'] = 'Repeat interval must be at least 1.'
            if recurrence_end_date and due_date and recurrence_end_date < due_date:
                errors['recurrence_end_date'] = 'Repeat until cannot be earlier than the due date.'
        if errors:
            raise serializers.ValidationError(errors)

        request = self.context.get('request')
        if self.instance and status and request and not self.instance.can_transition_to(status, request.user):
            raise serializers.ValidationError(
                f"Cannot change task status from {self.instance.get_status_display()} to {dict(Task.STATUS_CHOICES).get(status, status)}."
            )
        if status == 'completed' and self.instance and not self.instance.can_complete():
            raise serializers.ValidationError('Required checklist items and dependencies must be completed first.')
        if self.instance and request and not has_permission(request.user, 'tasks.assign'):
            protected = {'assigned_user', 'assigned_role', 'recurrence', 'recurrence_interval', 'recurrence_weekdays', 'recurrence_end_date', 'parent_task'}
            submitted_fields = set(getattr(self, 'initial_data', {}).keys())
            if protected.intersection(submitted_fields):
                raise PermissionDenied('You do not have permission to change task assignment or recurrence.')
        return attrs

    def update(self, instance, validated_data):
        old_status = instance.status
        instance = super().update(instance, validated_data)
        now = timezone.now()
        update_fields = []
        if instance.status == 'accepted' and old_status != 'accepted' and not instance.accepted_at:
            instance.accepted_at = now
            update_fields.append('accepted_at')
        if instance.status == 'completed' and old_status != 'completed':
            instance.completed_at = now
            update_fields.extend(['completed_at'])
            instance.generate_next_occurrence(user=self.context['request'].user)
        if update_fields:
            instance.save(update_fields=[*update_fields, 'updated_at'])
        return instance
