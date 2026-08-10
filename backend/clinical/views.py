from datetime import date, timezone as dt_timezone
from django.utils import timezone
from django.db import transaction
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from core.audit_service import audit_event
from core.permissions import has_permission

from core.audit import AuditLogMixin
from .models import (
    ToothChart, ToothRecord, TreatmentPlan, TreatmentPlanItem,
    ClinicalNote, ClinicalImage, RecallSchedule, ClinicalTemplate, OrthodonticCase,
    OrthodonticVisit, OrthodonticPhoto, OrthodonticDocument
)
from .serializers import (
    ToothChartSerializer, ToothChartWriteSerializer,
    ToothRecordSerializer, ToothRecordWriteSerializer,
    TreatmentPlanListSerializer, TreatmentPlanDetailSerializer, TreatmentPlanWriteSerializer,
    TreatmentPlanItemSerializer, TreatmentPlanItemWriteSerializer,
    ClinicalNoteListSerializer, ClinicalNoteDetailSerializer, ClinicalNoteWriteSerializer,
    ClinicalImageSerializer, RecallScheduleSerializer, ClinicalTemplateSerializer, OrthodonticCaseSerializer,
OrthodonticVisitSerializer, OrthodonticPhotoSerializer, OrthodonticDocumentSerializer
)
from .permissions import CanManageClinical, CanSignNotes
from .reminder_workflow import (
    complete_with_optional_recall, create_reminder, reminder_type_for_visit,
    transition_reminder,
)


# ── Tooth Chart ───────────────────────────────────────────────────────────────

class ToothChartViewSet(AuditLogMixin, viewsets.ModelViewSet):
    permission_classes = [CanManageClinical]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['patient']

    def get_queryset(self):
        return ToothChart.objects.select_related('patient').prefetch_related('teeth')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ToothChartWriteSerializer
        return ToothChartSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get', 'put', 'patch'], url_path='teeth/(?P<tooth_number>[0-9]+)')
    def tooth(self, request, pk=None, tooth_number=None):
        """Get or upsert a single tooth record."""
        chart = self.get_object()
        try:
            tooth_num = int(tooth_number)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid tooth number.'}, status=400)

        if request.method == 'GET':
            record = chart.teeth.filter(tooth_number=tooth_num).first()
            if not record:
                return Response({'tooth_number': tooth_num, 'condition': 'healthy', 'surface_conditions': {}})
            return Response(ToothRecordSerializer(record).data)

        # PUT / PATCH — upsert
        record, _ = ToothRecord.objects.get_or_create(
            chart=chart, tooth_number=tooth_num
        )
        previous = ToothRecordSerializer(record).data
        serializer = ToothRecordWriteSerializer(record, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        audit_event('tooth_finding_updated', 'ToothRecord', record.pk, request=request,
                    patient_id=chart.patient_id, previous_values={
                        'tooth_number': tooth_num, 'condition': previous.get('condition'),
                        'surface_conditions': previous.get('surface_conditions'),
                    }, new_values={
                        'tooth_number': tooth_num, 'condition': record.condition,
                        'surface_conditions': record.surface_conditions,
                    }, source_module='clinical')
        return Response(ToothRecordSerializer(record).data)

    @action(detail=True, methods=['patch'], url_path='teeth/bulk')
    def bulk_update_teeth(self, request, pk=None):
        """Update multiple teeth in one call. Body: [{tooth_number, condition, ...}]"""
        chart = self.get_object()
        items = request.data if isinstance(request.data, list) else request.data.get('teeth', [])
        updated = []
        for item in items:
            tooth_num = item.pop('tooth_number', None)
            if not tooth_num:
                continue
            record, _ = ToothRecord.objects.get_or_create(chart=chart, tooth_number=tooth_num)
            s = ToothRecordWriteSerializer(record, data=item, partial=True)
            if s.is_valid():
                s.save(updated_by=request.user)
                updated.append(tooth_num)
        return Response({'updated': updated})


# ── Treatment Plans ───────────────────────────────────────────────────────────

class TreatmentPlanViewSet(AuditLogMixin, viewsets.ModelViewSet):
    permission_classes = [CanManageClinical]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'dentist', 'status']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        return TreatmentPlan.objects.select_related(
            'patient', 'dentist'
        ).prefetch_related('items')

    def get_serializer_class(self):
        if self.action == 'list':
            return TreatmentPlanListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return TreatmentPlanWriteSerializer
        return TreatmentPlanDetailSerializer

    # ── Items sub-resource ────────────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='items')
    def items(self, request, pk=None):
        plan = self.get_object()
        if request.method == 'GET':
            serializer = TreatmentPlanItemSerializer(plan.items.all(), many=True)
            return Response(serializer.data)
        serializer = TreatmentPlanItemWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(plan=plan)
        return Response(TreatmentPlanItemSerializer(item).data, status=201)

    @action(detail=True, methods=['patch', 'delete'],
            url_path='items/(?P<item_id>[0-9a-f-]+)')
    def item_detail(self, request, pk=None, item_id=None):
        plan = self.get_object()
        try:
            item = plan.items.get(pk=item_id)
        except TreatmentPlanItem.DoesNotExist:
            return Response(status=404)

        if request.method == 'DELETE':
            item.delete()
            return Response(status=204)

        serializer = TreatmentPlanItemWriteSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get('status') == 'completed' and not item.completed_at:
            item.completed_at = timezone.now()
            item.save(update_fields=['completed_at'])
        serializer.save()
        return Response(TreatmentPlanItemSerializer(item).data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        plan = self.get_object()
        plan.status = 'accepted'
        plan.save(update_fields=['status', 'updated_at'])
        return Response(TreatmentPlanDetailSerializer(plan).data)


# ── Clinical Notes ────────────────────────────────────────────────────────────

class ClinicalNoteViewSet(AuditLogMixin, viewsets.ModelViewSet):
    permission_classes = [CanManageClinical]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'dentist', 'note_type', 'is_signed']
    search_fields = ['chief_complaint', 'diagnosis', 'treatment_performed', 'notes']
    ordering_fields = ['note_date', 'created_at']
    ordering = ['-note_date']


    AUTO_TEMPLATE_FIELDS = [
    'chief_complaint',
    'medical_dental_history',
    'family_social_history',
    'clinical_findings',
    'general_examination',
    'orofacial_examination',
    'diagnosis',
    'treatment_planned',
    'treatment_performed',
    'materials_used',
    'next_visit_instructions',
    ]

    def get_queryset(self):
        return ClinicalNote.objects.select_related(
            'patient', 'dentist'
        ).prefetch_related('images')

    def get_serializer_class(self):
        if self.action == 'list':
            return ClinicalNoteListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return ClinicalNoteWriteSerializer
        return ClinicalNoteDetailSerializer



    def _learn_templates(self, note):
        for field in self.AUTO_TEMPLATE_FIELDS:
            value = getattr(note, field, '')

            if not value:
                continue

            value = value.strip()
            if not value:
                continue

            existing = ClinicalTemplate.objects.filter(
                template_type=field,
                content__iexact=value
            ).first()

            if existing:
                existing.usage_count += 1
                existing.save()
            else:
                ClinicalTemplate.objects.create(
                    template_type=field,
                    label=value[:80],
                    content=value,
                    source='auto',
                    usage_count=1
                )


    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        note = serializer.save()

        self._learn_templates(note)

        output = ClinicalNoteDetailSerializer(
            note,
            context={'request': request}
        )

        return Response(output.data, status=201)



    @action(detail=True, methods=['post'], permission_classes=[CanSignNotes])
    def sign(self, request, pk=None):
        note = self.get_object()
        if note.is_signed:
            return Response({'error': 'Note is already signed.'}, status=400)
        note.is_signed = True
        note.signed_at = timezone.now()
        note.save(update_fields=['is_signed', 'signed_at'])
        return Response(ClinicalNoteDetailSerializer(note).data)

    @action(detail=False, methods=['get'])
    def timeline(self, request):
        """
        Unified, paginated patient timeline across clinical and operational records.
        ?patient=<uuid>
        """
        patient_id = request.query_params.get('patient')
        if not patient_id:
            return Response({'error': 'patient query param required.'}, status=400)

        from appointments.models import Appointment
        from patients.models import PatientCommunication, PatientDocument
        from tasks.models import Task

        notes_qs = ClinicalNote.objects.filter(patient_id=patient_id).select_related('dentist')
        images_qs = ClinicalImage.objects.filter(patient_id=patient_id).select_related('uploaded_by')

        events = []

        for n in notes_qs:
            events.append({
                'id': str(n.id),
                'event_type': 'note',
                'date': n.note_date.isoformat(),
                'title': n.get_note_type_display(),
                'subtitle': n.chief_complaint or n.diagnosis or '',
                'tooth_number': n.tooth_numbers,
                'meta': {
                    'dentist': n.dentist.get_full_name() if n.dentist else '',
                    'other_dentist_name': n.other_dentist_name,
                    'is_signed': n.is_signed,
                    'note_type': n.note_type,
                    'treatment_scope': n.treatment_scope,
                    'chief_complaint': n.chief_complaint,
                    'medical_dental_history': n.medical_dental_history,
                    'family_social_history': n.family_social_history,
                    'general_examination': n.general_examination,
                    'orofacial_examination': n.orofacial_examination,
                    'clinical_findings': n.clinical_findings,
                    'diagnosis': n.diagnosis,
                    'treatment_planned': n.treatment_planned,
                    'treatment_performed': n.treatment_performed,
                    'materials_used': n.materials_used,
                    'anesthesia_given': n.anesthesia_given,
                    'anesthesia_type': n.anesthesia_type,
                    'next_visit_instructions': n.next_visit_instructions,
                    'notes': n.notes,
                    'created_at': n.created_at.isoformat(),
                    'updated_at': n.updated_at.isoformat(),
                    'signed_at': n.signed_at.isoformat() if n.signed_at else '',
                },
            })

        for img in images_qs:
            events.append({
                'id': str(img.id),
                'event_type': 'image',
                'date': img.taken_at.isoformat(),
                'title': img.get_image_type_display(),
                'subtitle': img.caption or '',
                'tooth_number': img.tooth_number,
                'meta': {
                    'image_type': img.image_type,
                    'uploaded_by': img.uploaded_by.get_full_name() if img.uploaded_by else '',
                },
            })

        for appointment in Appointment.objects.filter(patient_id=patient_id).select_related('appointment_type', 'dentist'):
            events.append({'id': str(appointment.id), 'event_type': 'appointment', 'date': appointment.scheduled_date.isoformat(), 'title': appointment.appointment_type.name, 'subtitle': appointment.get_status_display(), 'tooth_number': '', 'meta': {'status': appointment.status, 'dentist': appointment.dentist.get_full_name()}})
        for recall in RecallSchedule.objects.filter(patient_id=patient_id):
            events.append({'id': str(recall.id), 'event_type': 'recall', 'date': recall.created_at.date().isoformat(), 'title': 'Reminder Created', 'subtitle': recall.get_recall_type_display(), 'tooth_number': '', 'meta': {'due_date': str(recall.due_date), 'status': recall.status}})
            milestones = [
                ('contacted_at', 'Reminder Contacted'),
                ('confirmed_at', 'Reminder Confirmed'),
                ('booked_at', 'Appointment Booked'),
                ('completed_at', 'Reminder Completed'),
                ('archived_at', 'Reminder Archived'),
                ('restored_at', 'Reminder Restored'),
            ]
            for field, title in milestones:
                timestamp = getattr(recall, field, None)
                if timestamp:
                    events.append({'id': f'{recall.id}-{field}', 'event_type': 'recall', 'date': timestamp.date().isoformat(), 'title': title, 'subtitle': recall.get_recall_type_display(), 'tooth_number': '', 'meta': {'status': recall.status}})
        for visit in OrthodonticVisit.objects.filter(ortho_case__patient_id=patient_id).select_related('dentist'):
            events.append({'id': str(visit.id), 'event_type': 'orthodontic', 'date': visit.visit_date.isoformat(), 'title': visit.get_visit_type_display(), 'subtitle': visit.clinical_notes or visit.notes, 'tooth_number': '', 'meta': {'dentist': visit.dentist.get_full_name() if visit.dentist else ''}})
        for document in PatientDocument.objects.filter(patient_id=patient_id, is_archived=False):
            events.append({'id': str(document.id), 'event_type': 'document', 'date': document.uploaded_at.isoformat(), 'title': document.title, 'subtitle': document.get_document_type_display(), 'tooth_number': '', 'meta': {'version': document.version}})
        for task in Task.objects.filter(patient_id=patient_id):
            event_date = task.completed_at or task.created_at
            events.append({'id': str(task.id), 'event_type': 'task', 'date': event_date.isoformat(), 'title': task.title, 'subtitle': task.get_status_display(), 'tooth_number': '', 'meta': {'priority': task.priority, 'status': task.status}})
        for communication in PatientCommunication.objects.filter(patient_id=patient_id):
            events.append({'id': str(communication.id), 'event_type': 'communication', 'date': communication.occurred_at.isoformat(), 'title': communication.subject, 'subtitle': communication.summary, 'tooth_number': '', 'meta': {'channel': communication.channel, 'direction': communication.direction}})

        events.sort(key=lambda e: e['date'], reverse=True)
        event_type = request.query_params.get('event_type')
        if event_type:
            events = [event for event in events if event['event_type'] == event_type]
        page = self.paginate_queryset(events)
        return self.get_paginated_response(page) if page is not None else Response(events)
        


# ── Clinical Images ───────────────────────────────────────────────────────────

class ClinicalImageViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageClinical]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['patient', 'clinical_note', 'appointment_id', 'tooth_number', 'image_type']

    def get_queryset(self):
        return ClinicalImage.objects.select_related('patient', 'uploaded_by')

    def get_serializer_class(self):
        return ClinicalImageSerializer

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)




class RecallScheduleViewSet(AuditLogMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RecallScheduleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['recall_type', 'status', 'patient', 'due_date']
    search_fields = ['patient__first_name', 'patient__last_name', 'patient__patient_code', 'patient__phone_primary']
    ordering_fields = ['due_date', 'created_at']

    def get_queryset(self):
        queryset = RecallSchedule.objects.select_related(
            'patient', 'clinical_note__dentist', 'linked_appointment__dentist',
            'booked_by', 'completed_by', 'archived_by'
        )
        if self.request.query_params.get('archived') == 'true':
            return queryset.filter(archived_at__isnull=False) if self.request.user.role == 'admin' else queryset.none()
        queryset = queryset.filter(archived_at__isnull=True)
        if self.request.query_params.get('overdue') == 'true':
            queryset = queryset.filter(due_date__lt=timezone.now().date()).exclude(status__in=['completed', 'cancelled'])
        return queryset

    @action(detail=True, methods=['post'])
    def contact(self, request, pk=None):
        reminder = self.get_object()
        if reminder.status not in ('active', 'contacted', 'confirmed', 'booked'):
            return Response({'detail': 'This reminder cannot be contacted.'}, status=400)
        now = timezone.now()
        history = list(reminder.contact_history or [])
        history.append({'contacted_at': now.isoformat(), 'contacted_by': str(request.user.pk),
                        'contacted_by_name': request.user.get_full_name() or request.user.email,
                        'method': request.data.get('method', 'phone'),
                        'outcome': request.data.get('outcome', ''), 'notes': request.data.get('notes', '')})
        old_status = reminder.status
        reminder.contact_history, reminder.contacted_at, reminder.contacted_by = history, now, request.user
        outcome = str(request.data.get('outcome', '')).strip().lower()
        if outcome == 'confirmed' and reminder.status in ('active', 'contacted', 'confirmed'):
            reminder.status, reminder.confirmed_at = 'confirmed', now
        elif reminder.status == 'active':
            reminder.status = 'contacted'
        reminder.save(update_fields=['contact_history','contacted_at','contacted_by','status','confirmed_at','updated_at'])
        audit_event('reminder_contacted', 'RecallSchedule', reminder.pk, request=request,
                    patient_id=reminder.patient_id,
                    previous_values={'status': old_status},
                    new_values={'status': reminder.status, 'method': request.data.get('method', 'phone'),
                                'outcome': outcome, 'notes': request.data.get('notes', '')},
                    source_module='clinical')
        return Response(self.get_serializer(reminder).data)

    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        reminder = self.get_object()
        if reminder.archived_at or reminder.status in ('completed', 'cancelled'):
            return Response({'detail': 'This reminder cannot be rescheduled.'}, status=400)
        reason = str(request.data.get('reason', '')).strip()
        try:
            new_date = date.fromisoformat(request.data.get('new_due_date', ''))
        except ValueError:
            return Response({'new_due_date': 'A valid date is required.'}, status=400)
        if not reason:
            return Response({'reason': 'Reason is required.'}, status=400)
        now, old_date = timezone.now(), reminder.due_date
        history = list(reminder.reschedule_history or [])
        history.append({'previous_due_date': old_date.isoformat(), 'new_due_date': new_date.isoformat(),
                        'reason': reason, 'notes': request.data.get('notes', ''),
                        'rescheduled_at': now.isoformat(), 'rescheduled_by': str(request.user.pk)})
        reminder.due_date, reminder.reschedule_history = new_date, history
        reminder.rescheduled_at, reminder.rescheduled_by, reminder.reschedule_reason = now, request.user, reason[:255]
        reminder.save(update_fields=['due_date','reschedule_history','rescheduled_at','rescheduled_by','reschedule_reason','updated_at'])
        audit_event('reminder_rescheduled', 'RecallSchedule', reminder.pk, request=request,
                    patient_id=reminder.patient_id, previous_values={'due_date': str(old_date)},
                    new_values={'due_date': str(new_date), 'reason': reason,
                                'notes': request.data.get('notes', '')}, source_module='clinical')
        return Response(self.get_serializer(reminder).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        reminder = self.get_object()
        old_status = reminder.status
        reason = str(request.data.get('reason', '')).strip()
        if reminder.status not in ('active','contacted','confirmed') or not reason:
            return Response({'reason': 'A reason is required for an unresolved reminder.'}, status=400)
        reminder.status, reminder.cancelled_at, reminder.cancelled_by = 'cancelled', timezone.now(), request.user
        reminder.cancellation_reason = reason[:255]
        reminder.save(update_fields=['status','cancelled_at','cancelled_by','cancellation_reason','updated_at'])
        audit_event('reminder_cancelled', 'RecallSchedule', reminder.pk, request=request,
                    patient_id=reminder.patient_id, previous_values={'status': old_status},
                    new_values={'status': 'cancelled', 'reason': reason}, source_module='clinical')
        return Response(self.get_serializer(reminder).data)

    @action(detail=True, methods=['post'], url_path='cancel-booking')
    def cancel_booking(self, request, pk=None):
        reason = str(request.data.get('reason', '')).strip()
        if not reason:
            return Response({'reason': 'Reason is required.'}, status=400)
        with transaction.atomic():
            reminder = RecallSchedule.objects.select_for_update().select_related('linked_appointment').get(pk=pk)
            if reminder.status != 'booked' or not reminder.linked_appointment:
                return Response({'detail': 'Only a booked reminder can cancel its booking.'}, status=400)
            appointment = reminder.linked_appointment
            appointment.status, appointment.cancellation_reason = 'cancelled', reason
            appointment.save(update_fields=['status','cancellation_reason','updated_at'])
            old_status = reminder.status
            reminder.status = 'cancelled'
            reminder.cancelled_at = timezone.now()
            reminder.cancelled_by = request.user
            reminder.cancellation_reason = reason[:255]
            reminder.save(update_fields=['status','cancelled_at','cancelled_by','cancellation_reason','updated_at'])
            audit_event('reminder_cancelled', 'RecallSchedule', reminder.pk, request=request,
                        patient_id=reminder.patient_id,
                        previous_values={'status': old_status},
                        new_values={'status': 'cancelled', 'reason': reason,
                                    'appointment': str(appointment.pk)}, source_module='clinical')
        return Response(self.get_serializer(reminder).data)

    @action(detail=True, methods=['post'], url_path='restore-cancelled')
    def restore_cancelled(self, request, pk=None):
        reminder = self.get_object()
        if reminder.status != 'cancelled':
            return Response({'detail': 'Only a cancelled reminder can be restored.'}, status=400)
        old_status = reminder.status
        reminder.status = 'active'
        reminder.restored_at = timezone.now()
        reminder.restored_by = request.user
        reminder.save(update_fields=['status', 'restored_at', 'restored_by', 'updated_at'])
        audit_event('reminder_cancelled_restored', 'RecallSchedule', reminder.pk, request=request,
                    patient_id=reminder.patient_id, previous_values={'status': old_status},
                    new_values={'status': 'active'}, source_module='clinical')
        return Response(self.get_serializer(reminder).data)

    @action(detail=True, methods=['post'])
    def transition(self, request, pk=None):
        reminder = self.get_object()
        next_status = request.data.get('status')
        appointment = None
        if next_status == 'booked':
            from appointments.models import Appointment
            try:
                appointment = Appointment.objects.get(pk=request.data.get('linked_appointment'))
            except (Appointment.DoesNotExist, ValueError, TypeError):
                return Response({'linked_appointment': 'A valid appointment is required.'}, status=400)
        transition_reminder(reminder, next_status, request.user, appointment=appointment, request=request)
        return Response(self.get_serializer(reminder).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        reminder = self.get_object()
        next_due = request.data.get('next_due_date')
        try:
            next_due = date.fromisoformat(next_due) if next_due else None
        except ValueError:
            return Response({'next_due_date': 'Use YYYY-MM-DD.'}, status=400)
        reminder, next_reminder = complete_with_optional_recall(
            reminder, request.user, next_due_date=next_due,
            next_type=request.data.get('next_type'), request=request)
        return Response({
            'reminder': self.get_serializer(reminder).data,
            'next_reminder': self.get_serializer(next_reminder).data if next_reminder else None,
        })

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        reminder = self.get_object()
        if reminder.status not in ('completed', 'cancelled'):
            return Response({'detail': 'Only completed or cancelled reminders can be archived.'}, status=400)
        reminder.archived_at = timezone.now()
        reminder.archived_by = request.user
        reminder.archived_reason = str(request.data.get('reason', ''))[:255]
        reminder.save(update_fields=['archived_at', 'archived_by', 'archived_reason', 'updated_at'])
        audit_event('reminder_archived', 'RecallSchedule', reminder.pk, request=request,
                    patient_id=reminder.patient_id,
                    previous_values={'status': reminder.status, 'archived': False},
                    new_values={'status': reminder.status, 'archived': True,
                                'reason': reminder.archived_reason}, source_module='clinical')
        return Response(self.get_serializer(reminder).data)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'detail': 'Administrator access required.'}, status=403)
        reminder = RecallSchedule.objects.filter(pk=pk, archived_at__isnull=False).first()
        if not reminder:
            return Response({'detail': 'Archived reminder not found.'}, status=404)
        old_status = reminder.status
        reminder.archived_at = reminder.archived_by = None
        reminder.archived_reason = ''
        reminder.status = 'active'
        reminder.restored_at = timezone.now()
        reminder.restored_by = request.user
        reminder.save(update_fields=['archived_at', 'archived_by', 'archived_reason', 'status', 'restored_at', 'restored_by', 'updated_at'])
        audit_event('reminder_restored', 'RecallSchedule', reminder.pk, request=request,
                    patient_id=reminder.patient_id, previous_values={'status': old_status, 'archived': True},
                    new_values={'status': 'active', 'archived': False}, source_module='clinical')
        return Response(self.get_serializer(reminder).data)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({'detail': 'Administrator access required.'}, status=403)
        reminder = RecallSchedule.objects.filter(pk=kwargs.get('pk'), archived_at__isnull=False, status='completed').first()
        if not reminder or request.data.get('confirmation') != 'DELETE':
            return Response({'detail': 'Archived completed reminder and DELETE confirmation required.'}, status=400)
        audit_event('reminder_permanently_deleted', 'RecallSchedule', reminder.pk, request=request,
                    patient_id=reminder.patient_id, previous_values={'status': reminder.status, 'archived_at': str(reminder.archived_at)},
                    source_module='clinical')
        reminder.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def due(self, request):
        today = timezone.now().date()

        recalls = RecallSchedule.objects.filter(
            due_date__lte=today,
            status='active'
        ).select_related('patient')

        serializer = self.get_serializer(recalls, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def orthodontic(self, request):
        recalls = RecallSchedule.objects.filter(
            recall_type='orthodontic',
            status='active'
        ).select_related('patient')

        serializer = self.get_serializer(recalls, many=True)
        return Response(serializer.data)
    


class ClinicalTemplateViewSet(ModelViewSet):
    serializer_class = ClinicalTemplateSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]

    filterset_fields = [
        'template_type',
        'source',
        'is_active'
    ]

    search_fields = [
        'label',
        'content'
    ]

    ordering_fields = [
        'usage_count',
        'last_used',
        'created_at'
    ]

    ordering = ['template_type', '-usage_count']

    def get_queryset(self):
        queryset = ClinicalTemplate.objects.all()

        active_only = self.request.query_params.get('active_only')

        if active_only == 'true':
            queryset = queryset.filter(is_active=True)

        return queryset

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        template = self.get_object()
        template.is_active = False
        template.save()
        return Response({'status': 'deactivated'})



    
class OrthodonticCaseViewSet(ModelViewSet):
    serializer_class = OrthodonticCaseSerializer
    permission_classes = [CanManageClinical]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'status']
    search_fields = [
        'patient__first_name', 'patient__last_name', 'patient__patient_code',
        'diagnosis', 'chief_complaint', 'treatment_plan', 'stage',
    ]
    ordering_fields = ['created_at', 'start_date', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        return OrthodonticCase.objects.select_related('patient').prefetch_related(
            'visits__dentist', 'photos', 'documents'
        )

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        case = self.get_object()
        case.status = 'archived'
        case.archived_at = timezone.now()
        case.save(update_fields=['status', 'archived_at', 'updated_at'])
        return Response(self.get_serializer(case).data)

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        case = self.get_object()
        events = []

        events.append({
            'id': f'case-{case.pk}',
            'event_type': 'case',
            'date': case.start_date,
            'title': 'Initial Consultation',
            'subtitle': case.chief_complaint or case.diagnosis,
            'meta': {'stage': case.stage, 'status': case.status},
        })

        for visit in case.visits.select_related('dentist').all():
            events.append({
                'id': f'visit-{visit.pk}',
                'event_type': 'visit',
                'date': visit.visit_date,
                'title': visit.get_visit_type_display(),
                'subtitle': visit.procedures_performed or visit.notes or visit.clinical_notes,
                'meta': {
                    'dentist': visit.dentist.get_full_name() if visit.dentist else '',
                    'measurements': visit.measurements,
                    'appliance_changes': visit.appliance_changes,
                    'next_review_date': visit.next_review_date,
                },
            })

        for photo in case.photos.all():
            events.append({
                'id': f'photo-{photo.pk}',
                'event_type': 'photo',
                'date': photo.taken_at,
                'title': photo.get_photo_type_display(),
                'subtitle': photo.caption,
                'meta': {'image': photo.image.url if photo.image else ''},
            })

        for document in case.documents.all():
            events.append({
                'id': f'document-{document.pk}',
                'event_type': 'document',
                'date': document.created_at.date(),
                'title': document.title,
                'subtitle': document.get_document_type_display(),
                'meta': {'version': document.version},
            })

        events.sort(key=lambda item: item['date'], reverse=True)
        return Response(events)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        case = self.get_object()
        visits = case.visits.all()
        completed = [item for item in case.milestones if item.get('completed')]
        return Response({
            'progress_percent': case.progress_percent,
            'current_stage': case.stage,
            'visit_count': visits.count(),
            'completed_stages': completed,
            'remaining_stages': [item for item in case.milestones if not item.get('completed')],
            'measurements': case.measurements,
            'appliances': case.appliances,
            'last_visit': OrthodonticVisitSerializer(visits.first(), context={'request': request}).data if visits.exists() else None,
        })


class OrthodonticVisitViewSet(ModelViewSet):
    serializer_class = OrthodonticVisitSerializer
    permission_classes = [CanManageClinical]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['ortho_case', 'dentist', 'visit_date', 'visit_type']
    search_fields = ['procedures_performed', 'notes', 'clinical_notes']
    ordering_fields = ['visit_date', 'created_at']
    ordering = ['-visit_date', '-created_at']

    def get_queryset(self):
        return OrthodonticVisit.objects.select_related('ortho_case__patient', 'dentist').prefetch_related('photos')

    def perform_create(self, serializer):
        visit = serializer.save(dentist=serializer.validated_data.get('dentist') or self.request.user)
        if visit.next_review_date:
            create_reminder(
                patient=visit.ortho_case.patient,
                due_date=visit.next_review_date,
                reminder_type='orthodontic',
                interval_days=max(1, (visit.next_review_date - visit.visit_date).days),
                user=self.request.user,
                notes=f'Generated from orthodontic visit {visit.pk}.',
            )

    def perform_update(self, serializer):
        visit = serializer.save()
        source = f'Generated from orthodontic visit {visit.pk}.'
        reminder = RecallSchedule.objects.filter(
            patient=visit.ortho_case.patient, recall_type='orthodontic',
            notes=source, archived_at__isnull=True,
        ).exclude(status__in=['completed', 'cancelled']).first()
        if visit.next_review_date:
            if reminder:
                if reminder.due_date != visit.next_review_date:
                    previous = reminder.due_date
                    history = list(reminder.reschedule_history or [])
                    history.append({
                        'previous_due_date': previous.isoformat(),
                        'new_due_date': visit.next_review_date.isoformat(),
                        'reason': 'Orthodontic next review updated',
                        'rescheduled_at': timezone.now().isoformat(),
                        'rescheduled_by': str(self.request.user.pk),
                    })
                    reminder.due_date = visit.next_review_date
                    reminder.reschedule_history = history
                    reminder.rescheduled_at = timezone.now()
                    reminder.rescheduled_by = self.request.user
                    reminder.reschedule_reason = 'Orthodontic next review updated'
                    reminder.save(update_fields=[
                        'due_date','reschedule_history','rescheduled_at','rescheduled_by',
                        'reschedule_reason','updated_at'])
                    audit_event('orthodontic_reminder_rescheduled', 'RecallSchedule', reminder.pk,
                                request=self.request, patient_id=reminder.patient_id,
                                previous_values={'due_date': str(previous)},
                                new_values={'due_date': str(visit.next_review_date)},
                                source_module='clinical')
            else:
                create_reminder(
                    patient=visit.ortho_case.patient, due_date=visit.next_review_date,
                    reminder_type='orthodontic',
                    interval_days=max(1, (visit.next_review_date - visit.visit_date).days),
                    user=self.request.user, notes=source,
                )


class OrthodonticPhotoViewSet(ModelViewSet):
    serializer_class = OrthodonticPhotoSerializer
    permission_classes = [CanManageClinical]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ortho_case', 'visit', 'photo_type']

    def get_queryset(self):
        return OrthodonticPhoto.objects.select_related('ortho_case__patient', 'visit', 'uploaded_by')

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class OrthodonticDocumentViewSet(ModelViewSet):
    serializer_class = OrthodonticDocumentSerializer
    permission_classes = [CanManageClinical]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ortho_case', 'document_type']

    def get_queryset(self):
        return OrthodonticDocument.objects.select_related('ortho_case__patient', 'uploaded_by')

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
