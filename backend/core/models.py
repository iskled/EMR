import logging
import hashlib
import json
import uuid

from django.db import models
from django.core.exceptions import PermissionDenied
from django.conf import settings


audit_logger = logging.getLogger('dental.audit')


class ClinicSettings(models.Model):
    clinic_name = models.CharField(max_length=200, default='Beyond Smile Dental Clinic')
    short_name = models.CharField(max_length=80, default='BSDC EMR')
    tagline = models.CharField(max_length=255, default='Dental Practice Platform', blank=True)
    logo = models.ImageField(upload_to='branding/', blank=True, null=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    primary_colour = models.CharField(max_length=7, default='#2563eb')
    secondary_colour = models.CharField(max_length=7, default='#0f172a')
    currency = models.CharField(max_length=3, default='NGN')
    locale = models.CharField(max_length=20, default='en-NG')
    timezone = models.CharField(max_length=60, default='Africa/Lagos')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'clinic_settings'

    def save(self, *args, **kwargs):
        if not self.pk:
            self.pk = 1
        super().save(*args, **kwargs)


class AuditLog(models.Model):

    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('view', 'View'),
        ('login', 'Login'),
        ('logout', 'Logout'),
    ]

    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )

    action = models.CharField(
        max_length=10,
        choices=ACTION_CHOICES
    )

    model_name = models.CharField(max_length=100)

    object_id = models.CharField(
        max_length=100,
        blank=True
    )

    object_repr = models.CharField(
        max_length=255,
        blank=True
    )

    changes = models.JSONField(
        null=True,
        blank=True
    )

    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True
    )

    timestamp = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:

        db_table = 'audit_logs'

        ordering = ['-timestamp']

        indexes = [
            models.Index(
                fields=['model_name', 'object_id']
            ),

            models.Index(
                fields=['user', 'timestamp']
            ),
        ]

    def __str__(self):

        return (
            f"{self.user} "
            f"{self.action} "
            f"{self.model_name}:{self.object_id}"
        )


class AuditEvent(models.Model):
    event_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    user = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_events')
    user_email = models.EmailField(blank=True)
    user_role = models.CharField(max_length=40, blank=True, db_index=True)
    action = models.CharField(max_length=80, db_index=True)
    resource_type = models.CharField(max_length=120, db_index=True)
    resource_id = models.CharField(max_length=120, blank=True, db_index=True)
    patient_id = models.CharField(max_length=120, blank=True, db_index=True)
    previous_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    request_method = models.CharField(max_length=12, blank=True)
    endpoint = models.CharField(max_length=500, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    correlation_id = models.CharField(max_length=120, blank=True, db_index=True)
    success = models.BooleanField(default=True, db_index=True)
    failure_reason = models.CharField(max_length=255, blank=True)
    source_module = models.CharField(max_length=80, blank=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    previous_hash = models.CharField(max_length=64, blank=True)
    event_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        db_table = 'audit_events'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp', 'success']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['patient_id', 'timestamp']),
            models.Index(fields=['source_module', 'timestamp']),
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionDenied('Audit events are append-only.')
        latest = AuditEvent.objects.order_by('-id').only('event_hash').first()
        self.previous_hash = latest.event_hash if latest else ''
        payload = {
            'event_id': str(self.event_id),
            'timestamp': self.timestamp.isoformat() if self.timestamp else '',
            'user_id': self.user_id,
            'user_email': self.user_email,
            'user_role': self.user_role,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'patient_id': self.patient_id,
            'previous_values': self.previous_values,
            'new_values': self.new_values,
            'request_method': self.request_method,
            'endpoint': self.endpoint,
            'success': self.success,
            'failure_reason': self.failure_reason,
            'source_module': self.source_module,
            'metadata': self.metadata,
            'previous_hash': self.previous_hash,
        }
        self.event_hash = hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionDenied('Audit events cannot be deleted.')

    def __str__(self):
        return f'{self.timestamp} {self.user_email} {self.action} {self.resource_type}:{self.resource_id}'


class SecurityAlert(models.Model):
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('acknowledged', 'Acknowledged'),
        ('resolved', 'Resolved'),
    ]

    alert_type = models.CharField(max_length=80, db_index=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium', db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open', db_index=True)
    user = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='security_alerts')
    user_email = models.EmailField(blank=True)
    message = models.CharField(max_length=255)
    source_module = models.CharField(max_length=80, blank=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    acknowledged_by = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'security_alerts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'severity']),
            models.Index(fields=['alert_type', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f'{self.alert_type}: {self.message}'


class LoginAttempt(models.Model):
    email = models.EmailField(db_index=True)
    user = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='login_attempts')
    success = models.BooleanField(default=False, db_index=True)
    failure_reason = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    correlation_id = models.CharField(max_length=120, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'login_attempts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'created_at']),
            models.Index(fields=['success', 'created_at']),
        ]

    def __str__(self):
        return f'{self.email} {"success" if self.success else "failure"}'
