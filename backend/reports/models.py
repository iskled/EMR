from django.conf import settings
from django.db import models


class SavedReport(models.Model):
    REPORT_TYPES = [
        ('executive', 'Executive Dashboard'),
        ('appointments', 'Appointments'),
        ('patients', 'Patients'),
        ('clinical', 'Clinical'),
        ('orthodontics', 'Orthodontics'),
        ('inventory', 'Inventory'),
        ('staff', 'Staff Productivity'),
    ]

    name = models.CharField(max_length=160)
    report_type = models.CharField(max_length=40, choices=REPORT_TYPES)
    filters = models.JSONField(default=dict, blank=True)
    is_shared = models.BooleanField(default=False, db_index=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='saved_reports',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['owner', 'report_type']),
            models.Index(fields=['is_shared', 'report_type']),
        ]

    def __str__(self):
        return self.name
