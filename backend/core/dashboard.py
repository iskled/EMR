from datetime import timedelta
import logging

from django.db.models import Count, Q
from django.utils import timezone

from appointments.models import Appointment
from authentication.models import User
from clinical.models import ClinicalNote, OrthodonticCase, OrthodonticVisit, RecallSchedule, TreatmentPlanItem
from inventory.models import InventoryAlert, StockMovement
from patients.models import Patient
from tasks.models import Task, TaskChecklistItem
from .models import AuditEvent, LoginAttempt, SecurityAlert
from .permissions import has_permission

logger = logging.getLogger(__name__)


def _safe_section(name, builder, errors, default):
    try:
        return builder()
    except Exception:
        logger.exception('Dashboard section failed: %s', name)
        errors[name] = 'temporarily_unavailable'
        return default


def _counts(queryset, field, values):
    rows = queryset.values(field).annotate(total=Count('pk'))
    found = {row[field]: row['total'] for row in rows}
    return {value: found.get(value, 0) for value in values}


def _appointments(user, today):
    qs = Appointment.objects.filter(scheduled_date=today).select_related('patient', 'dentist', 'appointment_type')
    if user.role == 'dentist':
        qs = qs.filter(dentist=user)
    statuses = _counts(qs, 'status', [value for value, _ in Appointment.STATUS_CHOICES])
    items = [{
        'id': str(item.pk), 'time': item.start_time.strftime('%H:%M'),
        'patient_id': str(item.patient_id), 'patient': item.patient.full_name,
        'appointment_type': item.appointment_type.name, 'status': item.status,
        'dentist': item.dentist.get_full_name() or item.dentist.email,
        'duration_minutes': item.duration_minutes,
        'is_orthodontic': item.appointment_type.slug.startswith('ortho'),
        'can_update_status': has_permission(user, 'appointments.write'),
    } for item in qs.order_by('start_time')[:30]]
    return {'total': qs.count(), 'statuses': statuses, 'items': items, 'checked_in_supported': False}


def _tasks(user, today):
    visible = Task.objects.filter(status__in=Task.OPEN_STATUSES)
    if user.role != 'admin':
        visible = visible.filter(Q(assigned_user=user) | Q(assigned_role=user.role) | Q(watchers=user)).distinct()
    week = today + timedelta(days=7)
    summary = {
        'open': visible.count(), 'my': visible.filter(assigned_user=user).count(),
        'team': visible.filter(assigned_role=user.role).count(),
        'due_today': visible.filter(due_date=today).count(),
        'due_week': visible.filter(due_date__range=(today, week)).count(),
        'overdue': visible.filter(due_date__lt=today).count(),
        'urgent': visible.filter(priority='urgent').count(),
        'blocked': visible.filter(status='blocked').count(),
        'unassigned': visible.filter(assigned_user__isnull=True, assigned_role='').count(),
        'incomplete_checklists': TaskChecklistItem.objects.filter(task__in=visible, is_required=True, is_completed=False).values('task_id').distinct().count(),
    }
    summary['items'] = [{
        'id': item.pk, 'title': item.title, 'priority': item.priority, 'status': item.status,
        'due_date': item.due_date, 'assigned_to': (item.assigned_user.get_full_name() or item.assigned_user.email) if item.assigned_user else item.assigned_role or 'Unassigned',
        'can_claim': item.assigned_user_id is None and has_permission(user, 'tasks.write'),
        'can_complete': has_permission(user, 'tasks.write'),
    } for item in visible.select_related('assigned_user').order_by('due_date', '-priority')[:8]]
    return summary


def _inventory(user):
    qs = InventoryAlert.objects.exclude(status='resolved').select_related('item', 'batch')
    counts = _counts(qs, 'alert_type', [value for value, _ in InventoryAlert.ALERT_TYPES])
    return {**counts, 'items': [{
        'id': item.pk, 'type': item.alert_type, 'message': item.message,
        'item': item.item.name if item.item else None, 'status': item.status,
    } for item in qs[:8]]}


def _orthodontics(today):
    visits = OrthodonticVisit.objects.filter(ortho_case__status='active').select_related('ortho_case__patient', 'dentist')
    due = visits.exclude(next_review_date=None)
    return {
        'active_cases': OrthodonticCase.objects.filter(status='active').count(),
        'due_today': due.filter(next_review_date=today).count(),
        'overdue': due.filter(next_review_date__lt=today).count(),
        'upcoming': due.filter(next_review_date__gt=today, next_review_date__lte=today + timedelta(days=14)).count(),
        'reviews': [{'case_id': item.ortho_case_id, 'patient_id': str(item.ortho_case.patient_id), 'patient': item.ortho_case.patient.full_name, 'next_review_date': item.next_review_date} for item in due.order_by('next_review_date')[:8]],
        'recent_visits': [{'case_id': item.ortho_case_id, 'patient': item.ortho_case.patient.full_name, 'visit_date': item.visit_date, 'visit_type': item.get_visit_type_display(), 'dentist': (item.dentist.get_full_name() or item.dentist.email) if item.dentist else None} for item in visits.order_by('-visit_date')[:6]],
    }


def _clinical(user, today):
    notes = ClinicalNote.objects.filter(is_signed=False).select_related('patient')
    if user.role == 'dentist':
        notes = notes.filter(dentist=user)
    recalls = RecallSchedule.objects.filter(
        status__in=['active', 'contacted', 'confirmed'],
        archived_at__isnull=True,
        due_date__lte=today,
    ).select_related('patient')
    return {
        'unsigned_notes': notes.count(), 'recalls_due': recalls.count(),
        'treatment_plan_actions': TreatmentPlanItem.objects.filter(status__in=['pending', 'planned']).count(),
        'alerts': ([{'type': 'unsigned_note', 'patient_id': str(n.patient_id), 'patient': n.patient.full_name, 'message': 'Clinical note awaiting signature'} for n in notes[:5]] +
                   [{'type': 'recall', 'patient_id': str(r.patient_id), 'patient': r.patient.full_name, 'message': f'Recall due {r.due_date}'} for r in recalls[:5]])[:8],
    }


def _activity(user):
    events = AuditEvent.objects.filter(success=True)
    if user.role != 'admin':
        events = events.filter(user=user).exclude(source_module__in=['authentication', 'security'])
    return [{'id': event.pk, 'action': event.action, 'resource_type': event.resource_type, 'timestamp': event.timestamp, 'source_module': event.source_module} for event in events[:10]]


def _security():
    since = timezone.now() - timedelta(hours=24)
    alerts = SecurityAlert.objects.filter(status='open')
    return {
        'open_alerts': alerts.count(), 'failed_logins_24h': LoginAttempt.objects.filter(success=False, created_at__gte=since).count(),
        'locked_accounts': User.objects.filter(locked_until__gt=timezone.now()).count(),
        'high_risk_events_24h': AuditEvent.objects.filter(timestamp__gte=since, action__in=['role_change', 'export', 'login_failure']).count(),
        'items': [{'id': a.pk, 'severity': a.severity, 'type': a.alert_type, 'message': a.message, 'created_at': a.created_at} for a in alerts[:6]],
    }


def dashboard_payload(user):
    today = timezone.localdate()
    errors = {}
    appointments = _safe_section('appointments', lambda: _appointments(user, today), errors, {'total': 0, 'statuses': {}, 'items': [], 'checked_in_supported': False})
    start_month = today.replace(day=1)
    data = {
        'generated_at': timezone.now(), 'date': today, 'role': user.role,
        'capabilities': {key: has_permission(user, key) for key in ['patients.write', 'appointments.write', 'clinical.view', 'clinical.write', 'orthodontics.view', 'inventory.view', 'inventory.usage', 'tasks.view', 'tasks.write', 'reports.view', 'users.manage', 'security.view', 'audit.view']},
        'appointments': appointments,
        'metrics': {'appointments_today': appointments['total'], **appointments['statuses']},
        'tasks': _safe_section('tasks', lambda: _tasks(user, today), errors, {'open': 0, 'my': 0, 'team': 0, 'due_today': 0, 'due_week': 0, 'overdue': 0, 'urgent': 0, 'blocked': 0, 'unassigned': 0, 'incomplete_checklists': 0, 'items': []}),
        'recent_activity': _safe_section('recent_activity', lambda: _activity(user), errors, []),
        'widget_errors': errors,
    }
    if user.role == 'admin':
        data['metrics'].update(active_patients=Patient.objects.filter(is_active=True).count(), new_patients_month=Patient.objects.filter(created_at__date__gte=start_month).count())
    if has_permission(user, 'orthodontics.view') and user.role != 'receptionist':
        data['orthodontics'] = _safe_section('orthodontics', lambda: _orthodontics(today), errors, {'active_cases': 0, 'due_today': 0, 'overdue': 0, 'upcoming': 0, 'reviews': [], 'recent_visits': []})
        data['metrics'].update(active_orthodontic_cases=data['orthodontics']['active_cases'], orthodontic_reviews_due=data['orthodontics']['due_today'] + data['orthodontics']['overdue'])
    if has_permission(user, 'clinical.view'):
        data['clinical'] = _safe_section('clinical', lambda: _clinical(user, today), errors, {'unsigned_notes': 0, 'recalls_due': 0, 'treatment_plan_actions': 0, 'alerts': []})
        data['metrics'].update(unsigned_notes=data['clinical']['unsigned_notes'], recalls_due=data['clinical']['recalls_due'])
    if has_permission(user, 'inventory.view') and user.role in ['admin', 'assistant']:
        data['inventory'] = _safe_section('inventory', lambda: _inventory(user), errors, {'low_stock': 0, 'out_of_stock': 0, 'expiring_soon': 0, 'expired': 0, 'overdue_po': 0, 'items': []})
        data['metrics'].update(low_stock=data['inventory']['low_stock'], out_of_stock=data['inventory']['out_of_stock'], expiring_inventory=data['inventory']['expiring_soon'] + data['inventory']['expired'])
    data['metrics'].update(open_tasks=data['tasks']['open'], overdue_tasks=data['tasks']['overdue'], urgent_tasks=data['tasks']['urgent'], blocked_tasks=data['tasks']['blocked'])
    if user.role == 'admin':
        data['security'] = _safe_section('security', _security, errors, {'open_alerts': 0, 'failed_logins_24h': 0, 'locked_accounts': 0, 'high_risk_events_24h': 0, 'items': []})
        data['staff_workload'] = _safe_section('staff_workload', lambda: list(User.objects.filter(is_active=True).values('id', 'first_name', 'last_name', 'role').annotate(open_tasks=Count('assigned_tasks', filter=Q(assigned_tasks__status__in=Task.OPEN_STATUSES))).order_by('-open_tasks')[:12]), errors, [])
    return data
