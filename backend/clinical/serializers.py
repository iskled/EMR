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
    OrthodonticVisit,
    OrthodonticPhoto,
    OrthodonticDocument,
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
    teeth = serializers.SerializerMethodField()
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

    def get_teeth(self, obj):
        permanent = (18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,
                     38,37,36,35,34,33,32,31,41,42,43,44,45,46,47,48)
        stored = {record.tooth_number: record for record in obj.teeth.all()}
        return [
            ToothRecordSerializer(stored[number]).data if number in stored else {
                'id': None, 'chart': str(obj.pk), 'tooth_number': number,
                'condition': 'healthy', 'surface_conditions': {},
                'mobility_grade': 0, 'pocket_depth': {}, 'furcation': '',
                'notes': '', 'updated_at': None,
            }
            for number in permanent
        ]


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
    def validate(self, attrs):
        dentist = attrs.get('dentist', getattr(self.instance, 'dentist', None))
        other = (attrs.get('other_dentist_name', getattr(self.instance, 'other_dentist_name', '')) or '').strip()
        if not dentist and not other:
            raise serializers.ValidationError({'dentist': 'Select a treating dentist or enter an external dentist name.'})
        if dentist and not dentist.is_active and (not self.instance or dentist.pk != self.instance.dentist_id):
            raise serializers.ValidationError({'dentist': 'Inactive dentists cannot be selected for a new clinical note.'})
        if dentist:
            attrs['other_dentist_name'] = ''
        else:
            attrs['other_dentist_name'] = other
        scope = attrs.get('treatment_scope', getattr(self.instance, 'treatment_scope', 'specific_teeth'))
        teeth = attrs.get('tooth_numbers', getattr(self.instance, 'tooth_numbers', []))
        if scope == 'whole_mouth':
            attrs['tooth_numbers'] = []
        elif not isinstance(teeth, list):
            raise serializers.ValidationError({'tooth_numbers': 'Selected teeth must be a list.'})
        return attrs

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
    patient_phone = serializers.CharField(source='patient.phone_primary', read_only=True)
    treating_dentist = serializers.SerializerMethodField()
    reminder_type_label = serializers.CharField(source='get_recall_type_display', read_only=True)
    clinical_visit_type = serializers.SerializerMethodField()
    booked_by_name = serializers.SerializerMethodField()
    appointment_date = serializers.DateField(source='linked_appointment.scheduled_date', read_only=True)
    appointment_time = serializers.TimeField(source='linked_appointment.start_time', format='%H:%M', read_only=True)
    appointment_dentist = serializers.SerializerMethodField()
    def get_treating_dentist(self, obj):
        note = obj.clinical_note
        return (note.dentist.get_full_name() if note and note.dentist else (note.other_dentist_name if note else ''))
    def get_clinical_visit_type(self, obj):
        return obj.clinical_note.get_note_type_display() if obj.clinical_note else ('Orthodontic Review' if obj.recall_type == 'orthodontic' else '')
    def get_booked_by_name(self, obj):
        return (obj.booked_by.get_full_name() or obj.booked_by.email) if obj.booked_by else ''
    def get_appointment_dentist(self, obj):
        appointment = obj.linked_appointment
        return (appointment.dentist.get_full_name() or appointment.dentist.email) if appointment else ''
    def validate(self, attrs):
        note = attrs.get('clinical_note')
        due = attrs.get('due_date')
        if note and due and due < note.note_date:
            raise serializers.ValidationError({'due_date': 'Recall date cannot be before the visit date.'})
        patient = attrs.get('patient', getattr(self.instance, 'patient', None))
        recall_type = attrs.get('recall_type', getattr(self.instance, 'recall_type', None))
        if patient and due and recall_type:
            duplicate = RecallSchedule.objects.filter(
                patient=patient, recall_type=recall_type, due_date=due, archived_at__isnull=True
            ).exclude(status='cancelled')
            if self.instance:
                duplicate = duplicate.exclude(pk=self.instance.pk)
            if duplicate.exists():
                raise serializers.ValidationError('A matching reminder already exists for this patient and due date.')
        return attrs
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
            'patient_phone',
            'treating_dentist',
            'clinical_note',
            'recall_type',
            'reminder_type_label',
            'clinical_visit_type',
            'due_date',
            'preset',
            'interval_days',
            'status',
            'contacted_at',
            'contacted_by',
            'contact_history',
            'confirmed_at',
            'snoozed_until',
            'linked_appointment',
            'appointment_date',
            'appointment_time',
            'appointment_dentist',
            'booked_at',
            'booked_by',
            'booked_by_name',
            'completed_at',
            'archived_at',
            'archived_reason',
            'restored_at',
            'rescheduled_at',
            'rescheduled_by',
            'reschedule_reason',
            'reschedule_history',
            'cancelled_at',
            'cancelled_by',
            'cancellation_reason',
            'notes',
            'created_at'
        ]
        read_only_fields = ('status', 'contacted_at', 'contacted_by', 'contact_history', 'confirmed_at', 'linked_appointment', 'booked_at', 'booked_by',
                            'completed_at', 'archived_at', 'archived_reason', 'restored_at')
        extra_kwargs = {'recall_type': {'required': False}}

    def create(self, validated_data):
        from .reminder_workflow import reminder_type_for_visit
        note = validated_data.get('clinical_note')
        if not validated_data.get('recall_type'):
            text = ' '.join(filter(None, [
                getattr(note, 'treatment_performed', ''),
                getattr(note, 'diagnosis', ''),
                getattr(note, 'chief_complaint', ''),
            ]))
            validated_data['recall_type'] = reminder_type_for_visit(
                getattr(note, 'note_type', 'custom'), text)
        if RecallSchedule.objects.filter(
            patient=validated_data['patient'],
            recall_type=validated_data['recall_type'],
            due_date=validated_data['due_date'],
            archived_at__isnull=True,
        ).exclude(status='cancelled').exists():
            raise serializers.ValidationError(
                'A matching reminder already exists for this patient and due date.')
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class ClinicalTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalTemplate
        fields = '__all__'



class OrthodonticPhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)

    class Meta:
        model = OrthodonticPhoto
        fields = '__all__'
        read_only_fields = ('uploaded_by', 'created_at')

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else None


class OrthodonticDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)

    class Meta:
        model = OrthodonticDocument
        fields = '__all__'
        read_only_fields = ('uploaded_by', 'created_at')

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None


class OrthodonticVisitSerializer(serializers.ModelSerializer):
    dentist_name = serializers.SerializerMethodField()
    photos = OrthodonticPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = OrthodonticVisit
        fields = '__all__'

    def get_dentist_name(self, obj):
        if obj.dentist:
            return obj.dentist.get_full_name() or obj.dentist.email
        return None


class OrthodonticCaseSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_code = serializers.CharField(source='patient.patient_code', read_only=True)
    visits = OrthodonticVisitSerializer(many=True, read_only=True)
    photos = OrthodonticPhotoSerializer(many=True, read_only=True)
    documents = OrthodonticDocumentSerializer(many=True, read_only=True)
    progress_percent = serializers.IntegerField(read_only=True)
    completed_visit_count = serializers.IntegerField(read_only=True)
    last_visit = serializers.SerializerMethodField()
    next_review_date = serializers.SerializerMethodField()
    treatment_duration_months = serializers.SerializerMethodField()
    estimated_remaining_months = serializers.SerializerMethodField()

    class Meta:
        model = OrthodonticCase
        fields = '__all__'
        read_only_fields = ('archived_at', 'created_at', 'updated_at')

    def get_patient_name(self, obj):
        return obj.patient.full_name

    def get_last_visit(self, obj):
        visit = obj.visits.order_by('-visit_date', '-created_at').first()
        return OrthodonticVisitSerializer(visit, context=self.context).data if visit else None

    def get_next_review_date(self, obj):
        visit = obj.visits.order_by('-visit_date', '-created_at').first()
        return visit.next_review_date if visit else None

    def get_treatment_duration_months(self, obj):
        if not obj.start_date:
            return 0
        end = obj.estimated_completion or obj.start_date
        return max(0, (end.year - obj.start_date.year) * 12 + end.month - obj.start_date.month)

    def get_estimated_remaining_months(self, obj):
        from datetime import date

        if obj.status == 'completed':
            return 0
        if not obj.estimated_completion:
            return None
        today = date.today()
        return max(0, (obj.estimated_completion.year - today.year) * 12 + obj.estimated_completion.month - today.month)
