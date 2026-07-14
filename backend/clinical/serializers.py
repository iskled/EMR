from rest_framework import serializers
from .models import (
    ToothChart,
    ToothRecord,
    TreatmentPlan,
    TreatmentPlanItem,
    ClinicalNote,
    ClinicalImage,
    RecallSchedule, 
    ClinicalTemplate, 
    OrthodonticCase,
    OrthodonticVisit
)

# ==========================================================
# TOOTH RECORD
# ==========================================================



class ToothRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToothRecord
        fields = [
            'id',
            'chart',
            'tooth_number',
            'condition',
            'surface_conditions',
            'mobility_grade',
            'pocket_depth',
            'furcation',
            'notes',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']


class ToothRecordWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToothRecord
        fields = [
            'chart',
            'tooth_number',
            'condition',
            'surface_conditions',
            'mobility_grade',
            'pocket_depth',
            'furcation',
            'notes',
        ]


# ==========================================================
# TOOTH CHART
# ==========================================================

class ToothChartSerializer(serializers.ModelSerializer):
    teeth = ToothRecordSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(
        source='patient.full_name',
        read_only=True
    )
    patient_code = serializers.CharField(
        source='patient.patient_code',
        read_only=True
    )

    class Meta:
        model = ToothChart
        fields = [
            'id',
            'patient',
            'patient_name',
            'patient_code',
            'dentition_type',
            'notes',
            'teeth',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']


class ToothChartWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToothChart
        fields = [
            'patient',
            'dentition_type',
            'notes'
        ]


# ==========================================================
# TREATMENT PLAN ITEMS
# ==========================================================

class TreatmentPlanItemSerializer(serializers.ModelSerializer):
    total_cost = serializers.SerializerMethodField()

    class Meta:
        model = TreatmentPlanItem
        fields = [
            'id',
            'tooth_number',
            'surfaces',
            'procedure_name',
            'procedure_code',
            'quantity',
            'unit_cost',
            'total_cost',
            'status',
            'priority',
            'notes',
            'completed_at',
            'sort_order',
        ]

    def get_total_cost(self, obj):
        if obj.unit_cost is not None:
            return float(obj.unit_cost * obj.quantity)
        return None


class TreatmentPlanItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentPlanItem
        fields = [
            'tooth_number',
            'surfaces',
            'procedure_name',
            'procedure_code',
            'quantity',
            'unit_cost',
            'status',
            'priority',
            'notes',
            'sort_order',
        ]


# ==========================================================
# TREATMENT PLAN
# ==========================================================

class TreatmentPlanListSerializer(serializers.ModelSerializer):
    dentist_name = serializers.CharField(
        source='dentist.get_full_name',
        read_only=True
    )

    class Meta:
        model = TreatmentPlan
        fields = [
            'id',
            'title',
            'description',
            'status',
            'dentist',
            'dentist_name',
            'estimated_cost',
            'created_at',
            'updated_at',
        ]


class TreatmentPlanDetailSerializer(serializers.ModelSerializer):
    items = TreatmentPlanItemSerializer(many=True, read_only=True)
    dentist_name = serializers.CharField(
        source='dentist.get_full_name',
        read_only=True
    )
    total_cost = serializers.SerializerMethodField()

    class Meta:
        model = TreatmentPlan
        fields = [
            'id',
            'patient',
            'title',
            'description',
            'status',
            'dentist',
            'dentist_name',
            'estimated_cost',
            'total_cost',
            'items',
            'created_at',
            'updated_at',
        ]

    def get_total_cost(self, obj):
        return float(obj.total_cost) if obj.total_cost else None


class TreatmentPlanWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentPlan
        fields = [
            'patient',
            'dentist',
            'title',
            'description',
            'status',
            'estimated_cost'
        ]


# ==========================================================
# CLINICAL IMAGE
# ==========================================================

class ClinicalImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ClinicalImage
        fields = [
            'id',
            'patient',
            'clinical_note',
            'appointment_id',
            'tooth_number',
            'image_type',
            'image',
            'image_url',
            'caption',
            'taken_at',
            'uploaded_by',
            'created_at',
        ]

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


# ==========================================================
# CLINICAL NOTE
# ==========================================================

class ClinicalNoteListSerializer(serializers.ModelSerializer):
    dentist_name = serializers.CharField(
        source='dentist.get_full_name',
        read_only=True
    )

    class Meta:
        model = ClinicalNote
        fields = [
            'id',
            'note_type',
            'tooth_numbers',
            'note_date',
            'dentist',
            'dentist_name',
            'chief_complaint',
            'diagnosis',
            'treatment_performed',
            'is_signed',
            'created_at',
        ]


class ClinicalNoteDetailSerializer(serializers.ModelSerializer):
    dentist_name = serializers.CharField(
        source='dentist.get_full_name',
        read_only=True
    )

    images = ClinicalImageSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = ClinicalNote
        fields = '__all__'


class ClinicalNoteWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalNote
        fields = '__all__'


# ==========================================================
# TIMELINE
# ==========================================================

class ClinicalTimelineSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    event_type = serializers.CharField()
    date = serializers.DateField()
    title = serializers.CharField()
    subtitle = serializers.CharField(allow_blank=True)
    meta = serializers.DictField()


# ==========================================================
# RECALL
# ==========================================================

class RecallScheduleSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(
        source='patient.full_name',
        read_only=True
    )

    patient_code = serializers.CharField(
        source='patient.patient_code',
        read_only=True
    )

    class Meta:
        model = RecallSchedule
        fields = [
            'id',
            'patient',
            'patient_name',
            'patient_code',
            'recall_type',
            'due_date',
            'interval_days',
            'status',
            'notes',
            'created_at'
        ]


class ClinicalTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalTemplate
        fields = '__all__'



class OrthodonticVisitSerializer(serializers.ModelSerializer):
    dentist_name = serializers.SerializerMethodField()

    class Meta:
        model = OrthodonticVisit
        fields = '__all__'

    def get_dentist_name(self, obj):
        if obj.dentist:
            return obj.dentist.get_full_name() or obj.dentist.username
        return None


class OrthodonticCaseSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    visits = OrthodonticVisitSerializer(many=True, read_only=True)

    class Meta:
        model = OrthodonticCase
        fields = '__all__'

    def get_patient_name(self, obj):
        return str(obj.patient)