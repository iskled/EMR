from django.db.models import Q, Count
from django.http import FileResponse
from django.utils import timezone

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import (
    MultiPartParser,
    FormParser,
    JSONParser,
)

from django_filters.rest_framework import DjangoFilterBackend

from core.audit import AuditLogMixin

from patients.models import (
    Patient,
    MedicalHistory,
    DentalHistory,
    Allergy,
    PatientDocument,
    PatientCommunication,
)

from patients.permissions import (
    CanManagePatients,
    CanManageMedicalHistory,
    CanManageDocuments,
)

from patients.serializers import (
    PatientListSerializer,
    PatientDetailSerializer,
    PatientWriteSerializer,
    MedicalHistorySerializer,
    DentalHistorySerializer,
    AllergySerializer,
    PatientDocumentSerializer,
    PatientCommunicationSerializer,
)


class PatientViewSet(AuditLogMixin, viewsets.ModelViewSet):
    permission_classes = [CanManagePatients]
    filterset_fields = ['is_active', 'gender', 'patient_category']

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        'first_name',
        'last_name',
        'patient_code',
        'phone_primary',
        'email',
    ]

    ordering_fields = [
        'last_name',
        'first_name',
        'created_at',
        'patient_code',
    ]

    ordering = ['-created_at']

    def get_queryset(self):
        queryset = (
            Patient.objects
            .select_related(
                'registered_by',
                'assigned_dentist'
            )
            .prefetch_related(
                'allergies',
                'documents',
            )
            .annotate(
                allergies_count=Count('allergies')
            )
        )

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return PatientListSerializer

        if self.action in (
            'create',
            'update',
            'partial_update',
        ):
            return PatientWriteSerializer

        return PatientDetailSerializer

    @action(
        detail=False,
        methods=['get'],
    )
    def search(self, request):
        query = request.query_params.get('q', '').strip()

        if len(query) < 2:
            return Response({
                'results': [],
            })

        patients = (
            self.get_queryset()
            .filter(
                Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
                | Q(patient_code__icontains=query)
                | Q(phone_primary__icontains=query)
            )
            .filter(is_active=True)[:15]
        )

        serializer = PatientListSerializer(
            patients,
            many=True,
        )

        return Response({
            'results': serializer.data,
        })

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        from appointments.models import Appointment
        from clinical.models import ClinicalImage, ClinicalNote, OrthodonticCase, RecallSchedule
        from tasks.models import Task
        patient = self.get_object()
        appointments = Appointment.objects.filter(patient=patient).select_related('dentist', 'appointment_type')
        last_visit = appointments.exclude(status__in=['cancelled', 'no_show']).filter(status='completed').order_by('-scheduled_date', '-start_time').first()
        next_appointment = appointments.filter(scheduled_date__gte=timezone.localdate(), status__in=Appointment.ACTIVE_STATUSES).order_by('scheduled_date', 'start_time').first()
        latest_note = ClinicalNote.objects.filter(patient=patient).select_related('dentist').first()
        recall = RecallSchedule.objects.filter(
            patient=patient, archived_at__isnull=True,
            status__in=['active', 'contacted', 'confirmed', 'booked']
        ).order_by('due_date').first()
        last_recall = RecallSchedule.objects.filter(patient=patient, status='completed').order_by('-completed_at').first()
        ortho = OrthodonticCase.objects.filter(patient=patient).exclude(status='archived').order_by('-created_at').first()
        clinical_allowed = request.user.role in ('admin', 'dentist', 'assistant')
        def appointment_data(item):
            if not item: return None
            return {'id': str(item.pk), 'date': item.scheduled_date, 'time': item.start_time, 'status': item.status, 'type': item.appointment_type.name, 'dentist': item.dentist.get_full_name() or item.dentist.email, 'reason': item.chief_complaint if clinical_allowed else ''}
        return Response({
            'last_visit': appointment_data(last_visit), 'next_appointment': appointment_data(next_appointment),
            'latest_note': ({'id': str(latest_note.pk), 'date': latest_note.note_date, 'type': latest_note.note_type, 'summary': latest_note.treatment_performed or latest_note.diagnosis or latest_note.chief_complaint, 'treatment_scope': latest_note.treatment_scope, 'selected_teeth': latest_note.tooth_numbers} if latest_note and clinical_allowed else None),
            'recall': ({'id': str(recall.pk), 'due_date': recall.due_date, 'preset': recall.preset, 'status': recall.status, 'type': recall.get_recall_type_display(), 'appointment': str(recall.linked_appointment_id or '')} if recall else None),
            'last_recall_completed': last_recall.completed_at if last_recall else None,
            'orthodontics': ({'id': ortho.pk, 'status': ortho.status, 'stage': ortho.stage, 'progress': ortho.progress_percent, 'next_review': ortho.visits.order_by('-visit_date').values_list('next_review_date', flat=True).first()} if ortho else None),
            'recent_images': ClinicalImage.objects.filter(patient=patient).count() if clinical_allowed else 0,
            'recent_documents': PatientDocument.objects.filter(patient=patient, is_archived=False).count(),
            'open_tasks': Task.objects.filter(patient=patient, status__in=Task.OPEN_STATUSES).count(),
            'allergies': list(patient.allergies.values('id', 'substance', 'reaction', 'severity')),
            'current_medications': getattr(getattr(patient, 'medical_history', None), 'current_medications', '') if clinical_allowed else '',
        })

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'detail': 'Admin permission required.'}, status=403)
        reason = str(request.data.get('reason', '')).strip()
        if not reason: return Response({'reason': 'Archive reason is required.'}, status=400)
        patient = self.get_object(); patient.is_active = False; patient.notes = f'{patient.notes}\nArchived: {reason}'.strip(); patient.save(update_fields=['is_active', 'notes', 'updated_at'])
        return Response(PatientDetailSerializer(patient).data)

    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        if request.user.role != 'admin': return Response({'detail': 'Admin permission required.'}, status=403)
        patient = self.get_object(); patient.is_active = True; patient.save(update_fields=['is_active', 'updated_at'])
        return Response(PatientDetailSerializer(patient).data)


class PatientDocumentViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = PatientDocumentSerializer
    permission_classes = [CanManageDocuments]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'document_type', 'is_archived']
    search_fields = ['title', 'description', 'file']
    ordering_fields = ['uploaded_at', 'title', 'document_type']
    ordering = ['-uploaded_at']

    def get_queryset(self):
        return PatientDocument.objects.select_related('patient', 'uploaded_by')

    def perform_create(self, serializer):
        upload = serializer.validated_data['file']
        serializer.save(uploaded_by=self.request.user, mime_type=getattr(upload, 'content_type', ''))

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        document = self.get_object()
        return FileResponse(document.file.open('rb'), content_type=document.mime_type or 'application/octet-stream', as_attachment=False, filename=document.file.name.rsplit('/', 1)[-1])

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        document = self.get_object()
        return FileResponse(document.file.open('rb'), content_type=document.mime_type or 'application/octet-stream', as_attachment=True, filename=document.file.name.rsplit('/', 1)[-1])

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        document = self.get_object()
        document.is_archived = True
        document.archived_at = timezone.now()
        document.save(update_fields=['is_archived', 'archived_at'])
        return Response(self.get_serializer(document).data)


class PatientCommunicationViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = PatientCommunicationSerializer
    permission_classes = [CanManagePatients]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['patient', 'channel', 'direction', 'follow_up_required']
    ordering_fields = ['occurred_at']
    ordering = ['-occurred_at']

    def get_queryset(self):
        return PatientCommunication.objects.select_related('patient', 'staff_member', 'linked_task')

    def perform_create(self, serializer):
        serializer.save(staff_member=self.request.user)


class MedicalHistoryViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = MedicalHistorySerializer
    permission_classes = [CanManageMedicalHistory]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['patient']
    queryset = MedicalHistory.objects.select_related('patient', 'updated_by')
    def perform_create(self, serializer): serializer.save(updated_by=self.request.user)
    def perform_update(self, serializer): serializer.save(updated_by=self.request.user)


class AllergyViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = AllergySerializer
    permission_classes = [CanManageMedicalHistory]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['patient', 'severity', 'allergy_type']
    queryset = Allergy.objects.select_related('patient', 'created_by')
    def perform_create(self, serializer): serializer.save(created_by=self.request.user)
