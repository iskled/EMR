import logging

from django.db import models


audit_logger = logging.getLogger('dental.audit')


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