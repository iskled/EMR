import logging
from django.db import models
from core.models import AuditLog

audit_logger = logging.getLogger('dental.audit')


class AuditLogMixin:
    def _get_ip(self, request):
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        return x_forwarded.split(',')[0] if x_forwarded else request.META.get('REMOTE_ADDR')

    def _log(self, request, action, instance, changes=None):
        try:
            AuditLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action=action,
                model_name=instance.__class__.__name__,
                object_id=str(instance.pk),
                object_repr=str(instance)[:255],
                changes=changes,
                ip_address=self._get_ip(request),
            )
        except Exception:
            audit_logger.exception("Failed to write audit log")

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log(self.request, 'create', instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._log(self.request, 'update', instance)

    def perform_destroy(self, instance):
        self._log(self.request, 'delete', instance)
        instance.delete()
