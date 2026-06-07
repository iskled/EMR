from django.db.models import Q, Count

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
)


class PatientViewSet(AuditLogMixin, viewsets.ModelViewSet):
    permission_classes = [CanManagePatients]

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

        if self.request.user.role == 'dentist':
            queryset = queryset.filter(
                assigned_dentist=self.request.user
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
