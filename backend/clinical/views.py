from datetime import date, timezone as dt_timezone
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.viewsets import ModelViewSet

from core.audit import AuditLogMixin
from .models import (
    ToothChart, ToothRecord, TreatmentPlan, TreatmentPlanItem,
    ClinicalNote, ClinicalImage, RecallSchedule, ClinicalTemplate, OrthodonticCase,
    OrthodonticVisit
)
from .serializers import (
    ToothChartSerializer, ToothChartWriteSerializer,
    ToothRecordSerializer, ToothRecordWriteSerializer,
    TreatmentPlanListSerializer, TreatmentPlanDetailSerializer, TreatmentPlanWriteSerializer,
    TreatmentPlanItemSerializer, TreatmentPlanItemWriteSerializer,
    ClinicalNoteListSerializer, ClinicalNoteDetailSerializer, ClinicalNoteWriteSerializer,
    ClinicalImageSerializer, RecallScheduleSerializer, ClinicalTemplateSerializer, OrthodonticCaseSerializer,
OrthodonticVisitSerializer
)
from .permissions import CanManageClinical, CanSignNotes


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
        serializer = ToothRecordWriteSerializer(record, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
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
        Merged timeline: clinical notes + images for a patient.
        ?patient=<uuid>
        """
        patient_id = request.query_params.get('patient')
        if not patient_id:
            return Response({'error': 'patient query param required.'}, status=400)

        notes_qs = ClinicalNote.objects.filter(patient_id=patient_id).select_related('dentist')
        images_qs = ClinicalImage.objects.filter(patient_id=patient_id).select_related('uploaded_by')

        events = []

        for n in notes_qs:
            events.append({
                'id': str(n.id),
                'event_type': 'note',
                'date': n.note_date,
                'title': n.get_note_type_display(),
                'subtitle': n.chief_complaint or n.diagnosis or '',
                'tooth_number': n.tooth_numbers,
                'meta': {
                    'dentist': n.dentist.get_full_name() if n.dentist else '',
                    'is_signed': n.is_signed,
                    'note_type': n.note_type,
                },
            })

        for img in images_qs:
            events.append({
                'id': str(img.id),
                'event_type': 'image',
                'date': img.taken_at,
                'title': img.get_image_type_display(),
                'subtitle': img.caption or '',
                'tooth_number': img.tooth_number,
                'meta': {
                    'image_type': img.image_type,
                    'uploaded_by': img.uploaded_by.get_full_name() if img.uploaded_by else '',
                },
            })

        events.sort(key=lambda e: e['date'], reverse=True)
        return Response(events)
        


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




class RecallScheduleViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageClinical]
    serializer_class = RecallScheduleSerializer

    def get_queryset(self):
        return RecallSchedule.objects.select_related(
            'patient',
            'clinical_note'
        )

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
    queryset = OrthodonticCase.objects.all().order_by('-created_at')
    serializer_class = OrthodonticCaseSerializer


class OrthodonticVisitViewSet(ModelViewSet):
    queryset = OrthodonticVisit.objects.all().order_by('-visit_date')
    serializer_class = OrthodonticVisitSerializer
