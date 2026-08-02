from datetime import date, datetime, timedelta
from decimal import Decimal

from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek

from appointments.models import Appointment
from authentication.models import User
from clinical.models import ClinicalNote, OrthodonticCase, OrthodonticVisit, RecallSchedule, TreatmentPlan
from inventory.models import InventoryBatch, InventoryItem, PurchaseOrder, StockMovement
from patients.models import Patient
from tasks.models import Task


def date_filters(params, field):
    filters = {}
    if params.get('start_date'):
        filters[f'{field}__gte'] = params['start_date']
    if params.get('end_date'):
        filters[f'{field}__lte'] = params['end_date']
    return filters


def serialize_decimal(value):
    if isinstance(value, Decimal):
        return float(value)
    return value or 0


def appointment_queryset(params):
    qs = Appointment.objects.select_related('dentist', 'appointment_type', 'patient')
    qs = qs.filter(**date_filters(params, 'scheduled_date'))
    if params.get('dentist'):
        qs = qs.filter(dentist_id=params['dentist'])
    if params.get('status'):
        qs = qs.filter(status=params['status'])
    if params.get('patient'):
        qs = qs.filter(patient_id=params['patient'])
    if params.get('appointment_type'):
        qs = qs.filter(appointment_type_id=params['appointment_type'])
    return qs


def executive_report(params):
    today = date.today()
    appointments = appointment_queryset(params)
    completed = appointments.filter(status='completed').count()
    no_show = appointments.filter(status='no_show').count()
    total_appointments = appointments.count()
    inventory_items = InventoryItem.objects.prefetch_related('batches')
    inventory_value = sum(item.stock_value for item in inventory_items)
    expiring = InventoryBatch.objects.filter(
        expiry_date__gte=today,
        expiry_date__lte=today + timedelta(days=30),
        quantity_remaining__gt=0,
    ).count()

    return {
        'metrics': {
            'total_active_patients': Patient.objects.filter(is_active=True).count(),
            'new_patients': Patient.objects.filter(**date_filters(params, 'created_at__date')).count(),
            'appointments_today': Appointment.objects.filter(scheduled_date=today).count(),
            'completion_rate': round((completed / total_appointments) * 100, 1) if total_appointments else 0,
            'no_show_rate': round((no_show / total_appointments) * 100, 1) if total_appointments else 0,
            'active_orthodontic_cases': OrthodonticCase.objects.filter(status='active').count(),
            'orthodontic_reviews_due': OrthodonticVisit.objects.filter(next_review_date__lte=today).count(),
            'inventory_value': serialize_decimal(inventory_value),
            'low_stock_count': len([item for item in inventory_items if item.current_stock > 0 and item.current_stock <= item.reorder_level]),
            'expiring_stock_count': expiring,
            'open_tasks': Task.objects.filter(status__in=Task.OPEN_STATUSES).count(),
            'overdue_tasks': Task.objects.filter(due_date__lt=today, status__in=Task.OPEN_STATUSES).count(),
        }
    }


def appointment_report(params):
    qs = appointment_queryset(params)
    return {
        'daily_volume': list(qs.annotate(period=TruncDay('scheduled_date')).values('period').annotate(count=Count('id')).order_by('period')),
        'weekly_volume': list(qs.annotate(period=TruncWeek('scheduled_date')).values('period').annotate(count=Count('id')).order_by('period')),
        'monthly_volume': list(qs.annotate(period=TruncMonth('scheduled_date')).values('period').annotate(count=Count('id')).order_by('period')),
        'status_breakdown': list(qs.values('status').annotate(count=Count('id')).order_by('status')),
        'dentist_workload': list(qs.values('dentist_id', 'dentist__first_name', 'dentist__last_name', 'dentist__email').annotate(count=Count('id'), avg_duration=Avg('duration_minutes')).order_by('-count')),
        'appointment_type_volume': list(qs.values('appointment_type__name').annotate(count=Count('id')).order_by('-count')),
        'no_shows': qs.filter(status='no_show').count(),
        'cancellations': qs.filter(status='cancelled').count(),
        'average_duration': serialize_decimal(qs.aggregate(avg=Avg('duration_minutes'))['avg']),
    }


def patient_report(params):
    qs = Patient.objects.all()
    qs = qs.filter(**date_filters(params, 'created_at__date'))
    future_patient_ids = Appointment.objects.filter(scheduled_date__gte=date.today()).values_list('patient_id', flat=True)
    age_groups = {'0-17': 0, '18-34': 0, '35-54': 0, '55+': 0, 'unknown': 0}
    for patient in qs:
        age = patient.age
        if age < 18:
            age_groups['0-17'] += 1
        elif age < 35:
            age_groups['18-34'] += 1
        elif age < 55:
            age_groups['35-54'] += 1
        else:
            age_groups['55+'] += 1

    return {
        'new_patients': qs.count(),
        'active_patients': Patient.objects.filter(is_active=True).count(),
        'inactive_patients': Patient.objects.filter(is_active=False).count(),
        'recall_due': RecallSchedule.objects.filter(due_date=date.today(), status='active').count(),
        'recall_overdue': RecallSchedule.objects.filter(due_date__lt=date.today(), status='active').count(),
        'age_groups': [{'group': key, 'count': value} for key, value in age_groups.items()],
        'referral_sources': list(Patient.objects.values('referral_source').annotate(count=Count('id')).order_by('-count')),
        'patients_without_future_appointment': Patient.objects.exclude(id__in=future_patient_ids).count(),
    }


def clinical_report(params):
    notes = ClinicalNote.objects.select_related('dentist').filter(**date_filters(params, 'note_date'))
    if params.get('dentist'):
        notes = notes.filter(dentist_id=params['dentist'])
    return {
        'clinical_notes_volume': list(notes.annotate(period=TruncMonth('note_date')).values('period').annotate(count=Count('id')).order_by('period')),
        'procedure_volumes': list(notes.values('treatment_performed').exclude(treatment_performed='').annotate(count=Count('id')).order_by('-count')[:20]),
        'treatment_plans_by_status': list(TreatmentPlan.objects.values('status').annotate(count=Count('id')).order_by('status')),
        'recalls': list(RecallSchedule.objects.values('recall_type', 'status').annotate(count=Count('id')).order_by('recall_type')),
        'dentist_activity': list(notes.values('dentist_id', 'dentist__first_name', 'dentist__last_name', 'dentist__email').annotate(count=Count('id')).order_by('-count')),
        'common_diagnoses': list(notes.values('diagnosis').exclude(diagnosis='').annotate(count=Count('id')).order_by('-count')[:20]),
    }


def orthodontic_report(params):
    cases = OrthodonticCase.objects.prefetch_related('visits')
    if params.get('status'):
        cases = cases.filter(status=params['status'])
    if params.get('orthodontic_stage'):
        cases = cases.filter(stage__icontains=params['orthodontic_stage'])
    visits = OrthodonticVisit.objects.select_related('dentist', 'ortho_case')
    visits = visits.filter(**date_filters(params, 'visit_date'))
    return {
        'active_cases': cases.filter(status='active').count(),
        'completed_cases': cases.filter(status='completed').count(),
        'retention_cases': cases.filter(status='retention').count(),
        'cases_by_stage': list(cases.values('stage').annotate(count=Count('id')).order_by('-count')),
        'average_treatment_duration': serialize_decimal(cases.aggregate(avg=Avg('estimated_duration_months'))['avg']),
        'reviews_due': OrthodonticVisit.objects.filter(next_review_date__lte=date.today()).count(),
        'visits_per_case': list(visits.values('ortho_case_id', 'ortho_case__patient__first_name', 'ortho_case__patient__last_name').annotate(count=Count('id')).order_by('-count')),
        'measurement_trends': list(visits.exclude(measurements={}).values('visit_date', 'measurements').order_by('visit_date')[:50]),
    }


def inventory_report(params):
    items = InventoryItem.objects.select_related('category', 'storage_location').prefetch_related('batches')
    if params.get('inventory_category'):
        items = items.filter(category_id=params['inventory_category'])
    if params.get('inventory_location'):
        items = items.filter(storage_location_id=params['inventory_location'])
    movements = StockMovement.objects.select_related('item', 'user').filter(**date_filters(params, 'created_at__date'))
    if params.get('supplier'):
        movements = movements.filter(batch__supplier_id=params['supplier'])
    return {
        'current_stock': [{'sku': item.sku, 'name': item.name, 'stock': serialize_decimal(item.current_stock), 'value': serialize_decimal(item.stock_value)} for item in items],
        'stock_valuation': serialize_decimal(sum(item.stock_value for item in items)),
        'low_stock': len([item for item in items if item.current_stock > 0 and item.current_stock <= item.reorder_level]),
        'out_of_stock': len([item for item in items if item.current_stock <= 0]),
        'expiring_soon': InventoryBatch.objects.filter(expiry_date__lte=date.today() + timedelta(days=30), expiry_date__gte=date.today(), quantity_remaining__gt=0).count(),
        'expired': InventoryBatch.objects.filter(expiry_date__lt=date.today(), quantity_remaining__gt=0).count(),
        'usage_by_item': list(movements.filter(movement_type='usage').values('item__sku', 'item__name').annotate(quantity=Sum('quantity')).order_by('quantity')),
        'usage_by_clinician': list(movements.filter(movement_type='usage').values('user_id', 'user__first_name', 'user__last_name', 'user__role').annotate(quantity=Sum('quantity')).order_by('quantity')),
        'supplier_purchase_history': list(PurchaseOrder.objects.values('supplier__name', 'status').annotate(count=Count('id')).order_by('supplier__name')),
        'movement_audit': list(movements.values('item__sku', 'item__name', 'movement_type', 'quantity', 'balance_before', 'balance_after', 'created_at', 'notes')[:100]),
    }


def staff_report(params):
    users = User.objects.filter(is_active=True)
    if params.get('staff_role'):
        users = users.filter(role=params['staff_role'])
    if params.get('staff'):
        users = users.filter(id=params['staff'])
    user_ids = list(users.values_list('id', flat=True))
    return {
        'appointment_volume': list(Appointment.objects.filter(dentist_id__in=user_ids, **date_filters(params, 'scheduled_date')).values('dentist_id', 'dentist__first_name', 'dentist__last_name', 'dentist__role').annotate(count=Count('id')).order_by('-count')),
        'clinical_activity': list(ClinicalNote.objects.filter(dentist_id__in=user_ids, **date_filters(params, 'note_date')).values('dentist_id', 'dentist__first_name', 'dentist__last_name').annotate(count=Count('id')).order_by('-count')),
        'orthodontic_visits': list(OrthodonticVisit.objects.filter(dentist_id__in=user_ids, **date_filters(params, 'visit_date')).values('dentist_id', 'dentist__first_name', 'dentist__last_name').annotate(count=Count('id')).order_by('-count')),
        'inventory_activity': list(StockMovement.objects.filter(user_id__in=user_ids, **date_filters(params, 'created_at__date')).values('user_id', 'user__first_name', 'user__last_name', 'user__role').annotate(count=Count('id')).order_by('-count')),
        'task_completion': list(Task.objects.filter(
            assigned_user_id__in=user_ids,
            status='completed',
            **date_filters(params, 'completed_at__date'),
        ).values('assigned_user_id', 'assigned_user__first_name', 'assigned_user__last_name', 'assigned_user__role').annotate(count=Count('id')).order_by('-count')),
    }


REPORT_MAP = {
    'executive': executive_report,
    'appointments': appointment_report,
    'patients': patient_report,
    'clinical': clinical_report,
    'orthodontics': orthodontic_report,
    'inventory': inventory_report,
    'staff': staff_report,
}


def run_report(report_type, params):
    report = REPORT_MAP[report_type](params)
    report['generated_at'] = datetime.utcnow().isoformat() + 'Z'
    report['parameters'] = params
    report['report_type'] = report_type
    return report
