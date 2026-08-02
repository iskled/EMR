import copy
import logging
import re

from django.utils import timezone

from .models import AuditEvent, SecurityAlert


logger = logging.getLogger('dental.audit')
SENSITIVE_KEYS = re.compile(r'(password|token|secret|card|credential|authorization|refresh|access)', re.I)


def request_ip(request):
    if not request:
        return None
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return forwarded.split(',')[0].strip() if forwarded else request.META.get('REMOTE_ADDR')


def correlation_id(request):
    if not request:
        return ''
    return getattr(request, 'correlation_id', '') or request.headers.get('X-Request-ID', '')


def redact(value):
    if isinstance(value, dict):
        clean = {}
        for key, item in value.items():
            clean[key] = '[REDACTED]' if SENSITIVE_KEYS.search(str(key)) else redact(item)
        return clean
    if isinstance(value, list):
        return [redact(item) for item in value]
    return value


def model_snapshot(instance):
    data = {}
    if not instance:
        return data
    for field in instance._meta.fields:
        name = field.name
        if SENSITIVE_KEYS.search(name):
            continue
        value = getattr(instance, name, None)
        data[name] = str(value) if value is not None else None
    return data


def patient_id_for(instance):
    if not instance:
        return ''
    if instance.__class__.__name__ == 'Patient':
        return str(instance.pk)
    patient = getattr(instance, 'patient', None)
    if patient:
        return str(getattr(patient, 'pk', patient))
    task_patient_id = getattr(instance, 'patient_id', None)
    return str(task_patient_id) if task_patient_id else ''


def audit_event(action, resource_type, resource_id='', request=None, user=None, patient_id='', previous_values=None, new_values=None, success=True, failure_reason='', source_module='', metadata=None):
    actor = user or getattr(request, 'user', None)
    if actor and not getattr(actor, 'is_authenticated', False):
        actor = None
    try:
        return AuditEvent.objects.create(
            user=actor,
            user_email=getattr(actor, 'email', '') if actor else '',
            user_role=getattr(actor, 'role', '') if actor else '',
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id or ''),
            patient_id=str(patient_id or ''),
            previous_values=redact(copy.deepcopy(previous_values or {})),
            new_values=redact(copy.deepcopy(new_values or {})),
            request_method=getattr(request, 'method', '') if request else '',
            endpoint=getattr(request, 'path', '') if request else '',
            ip_address=request_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
            correlation_id=correlation_id(request),
            success=success,
            failure_reason=failure_reason[:255],
            source_module=source_module or resource_type.split('.')[0].lower(),
            metadata=redact(metadata or {}),
        )
    except Exception:
        logger.exception('Failed to write audit event')
        SecurityAlert.objects.create(
            alert_type='audit_logging_failure',
            severity='critical',
            message='Audit logging failed.',
            source_module='core',
            metadata={'action': action, 'resource_type': resource_type, 'created_at': timezone.now().isoformat()},
        )
        return None


def security_alert(alert_type, message, user=None, severity='medium', source_module='security', metadata=None):
    return SecurityAlert.objects.create(
        alert_type=alert_type,
        severity=severity,
        user=user,
        user_email=getattr(user, 'email', '') if user else '',
        message=message[:255],
        source_module=source_module,
        metadata=redact(metadata or {}),
    )
