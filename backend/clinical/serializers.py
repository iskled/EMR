from rest_framework import serializers
from .models import (
    ToothChart, ToothRecord, TreatmentPlan, TreatmentPlanItem,
    ClinicalNote, ClinicalImage,
)


# ── Tooth Record ──────────────────────────────────────────────────────────────

class ToothRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToothRecord
        fields = [
            'id', 'tooth_number', 'condition', 'surface_conditions',
            'mobility_grade', 'pocket_depth', 'furcation', 'notes', 'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']


class ToothRecordWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToothRecord
        fields = [
            'tooth_number', 'condition', 'surface_conditions',
            'mobility_grade', 'pocket_depth', 'furcation', 'notes',
        ]


# ── Tooth Chart ───────────────────────────────────────────────────────────────

class ToothChartSerializer(serializers.ModelSerializer):
    teeth = ToothRecordSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_code = serializers.CharField(source='patient.patient_code', read_only=True)

    class Meta:
        model = ToothChart
        fields = [
            'id', 'patient', 'patient_name', 'patient_code',
            'dentition_type', 'notes', 'teeth', 'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']


class ToothChartWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToothChart
        fields = ['patient', 'dentition_type', 'notes']


# ── Treatment Plan Item ───────────────────────────────────────────────────────

class TreatmentPlanItemSerializer(serializers.ModelSerializer):
    total_cost = serializers.SerializerMethodField()

    class Meta:
        model = TreatmentPlanItem
        fields = [
            'id', 'tooth_number', 'surfaces', 'procedure_name', 'procedure_code',
            'quantity', 'unit_cost', 'total_cost', 'status', 'priority',
            'notes', 'completed_at', 'sort_order',
        ]
        read_only_fields = ['id', 'total_cost']

    def get_total_cost(self, obj):
        if obj.unit_cost is not None:
            return float(obj.unit_cost * obj.quantity)
        return None


class TreatmentPlanItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentPlanItem
        fields = [
            'tooth_number', 'surfaces', 'procedure_name', 'procedure_code',
            'quantity', 'unit_cost', 'status', 'priority', 'notes', 'sort_order',
        ]


# ── Treatment Plan ────────────────────────────────────────────────────────────

class TreatmentPlanListSerializer(serializers.ModelSerializer):
    dentist_name = serializers.CharField(source='dentist.get_full_name', read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    completed_items = serializers.IntegerField(read_only=True)

    class Meta:
        model = TreatmentPlan
        fields = [
            'id', 'title', 'description', 'status', 'dentist', 'dentist_name',
            'estimated_cost', 'total_items', 'completed_items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TreatmentPlanDetailSerializer(serializers.ModelSerializer):
    items = TreatmentPlanItemSerializer(many=True, read_only=True)
    dentist_name = serializers.CharField(source='dentist.get_full_name', read_only=True)
    total_cost = serializers.SerializerMethodField()
    total_items = serializers.IntegerField(read_only=True)
    completed_items = serializers.IntegerField(read_only=True)

    class Meta:
        model = TreatmentPlan
        fields = [
            'id', 'patient', 'title', 'description', 'status',
            'dentist', 'dentist_name', 'estimated_cost', 'total_cost',
            'total_items', 'completed_items', 'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_cost']

    def get_total_cost(self, obj):
        return float(obj.total_cost) if obj.total_cost else None


class TreatmentPlanWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentPlan
        fields = ['patient', 'dentist', 'title', 'description', 'status', 'estimated_cost']


# ── Clinical Image ────────────────────────────────────────────────────────────

class ClinicalImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)

    class Meta:
        model = ClinicalImage
        fields = [
            'id', 'patient', 'clinical_note', 'appointment', 'tooth_number',
            'image_type', 'image', 'image_url', 'caption', 'taken_at',
            'uploaded_by', 'uploaded_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'image_url', 'uploaded_by', 'created_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else None


# ── Clinical Note ─────────────────────────────────────────────────────────────

class ClinicalNoteListSerializer(serializers.ModelSerializer):
    dentist_name = serializers.CharField(source='dentist.get_full_name', read_only=True)
    image_count = serializers.SerializerMethodField()

    class Meta:
        model = ClinicalNote
        fields = [
            'id', 'note_type', 'tooth_number', 'note_date', 'dentist', 'dentist_name',
            'chief_complaint', 'diagnosis', 'treatment_performed',
            'is_signed', 'image_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_image_count(self, obj):
        return obj.images.count()


class ClinicalNoteDetailSerializer(serializers.ModelSerializer):
    dentist_name = serializers.CharField(source='dentist.get_full_name', read_only=True)
    images = ClinicalImageSerializer(many=True, read_only=True)

    class Meta:
        model = ClinicalNote
        fields = [
            'id', 'patient', 'appointment', 'dentist', 'dentist_name',
            'note_type', 'tooth_number', 'note_date',
            'chief_complaint', 'clinical_findings', 'diagnosis',
            'treatment_performed', 'materials_used',
            'anesthesia_given', 'anesthesia_type',
            'next_visit_instructions', 'notes',
            'is_signed', 'signed_at', 'images', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'is_signed', 'signed_at', 'created_at', 'updated_at']


class ClinicalNoteWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalNote
        fields = [
            'patient', 'appointment', 'dentist', 'note_type', 'tooth_number', 'note_date',
            'chief_complaint', 'clinical_findings', 'diagnosis',
            'treatment_performed', 'materials_used',
            'anesthesia_given', 'anesthesia_type',
            'next_visit_instructions', 'notes',
        ]


# ── Timeline ──────────────────────────────────────────────────────────────────

class ClinicalTimelineSerializer(serializers.Serializer):
    """Merged timeline of notes + images for a patient, sorted by date."""
    id = serializers.UUIDField()
    event_type = serializers.CharField()
    date = serializers.DateField()
    title = serializers.CharField()
    subtitle = serializers.CharField(allow_blank=True)
    tooth_number = serializers.IntegerField(allow_null=True)
    meta = serializers.DictField()
