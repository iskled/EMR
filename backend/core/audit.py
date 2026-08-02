import logging
from django.db import models
from core.models import AuditLog
from core.audit_service import audit_event, model_snapshot, patient_id_for

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
        audit_event(
            action=action,
            resource_type=instance.__class__.__name__,
            resource_id=str(instance.pk),
            request=request,
            patient_id=patient_id_for(instance),
            previous_values=changes.get('previous', {}) if isinstance(changes, dict) else {},
            new_values=changes.get('new', changes or model_snapshot(instance)) if isinstance(changes, dict) else model_snapshot(instance),
            success=True,
            source_module=instance._meta.app_label,
        )

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log(self.request, 'create', instance)

    def perform_update(self, serializer):
        previous = model_snapshot(self.get_object()) if hasattr(self, 'get_object') else {}
        instance = serializer.save()
        self._log(self.request, 'update', instance, {'previous': previous, 'new': model_snapshot(instance)})

    def perform_destroy(self, instance):
        self._log(self.request, 'delete', instance)
        instance.delete()
