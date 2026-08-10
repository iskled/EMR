from datetime import date, datetime, timedelta
from rest_framework import serializers
from django.db import transaction
from .models import Appointment, AppointmentType, WaitingList


class AppointmentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentType
        fields = '__all__'


# ── List serializer (calendar / daily cards) ──────────────────────────────────

class AppointmentListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_code = serializers.CharField(source='patient.patient_code', read_only=True)
    patient_phone = serializers.CharField(source='patient.phone_primary', read_only=True)
    dentist_name = serializers.CharField(source='dentist.get_full_name', read_only=True)
    type_name = serializers.CharField(source='appointment_type.name', read_only=True)
    type_color = serializers.CharField(source='appointment_type.color', read_only=True)
    type_requires_anesthesia = serializers.BooleanField(
        source='appointment_type.requires_anesthesia', read_only=True
    )
    start_time = serializers.TimeField(format='%H:%M')
    end_time = serializers.TimeField(format='%H:%M')

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'patient_name', 'patient_code', 'patient_phone',
            'dentist', 'dentist_name',
            'appointment_type', 'type_name', 'type_color', 'type_requires_anesthesia',
            'scheduled_date', 'start_time', 'end_time', 'duration_minutes',
            'status', 'chief_complaint', 'created_at',
        ]


# ── Detail serializer ─────────────────────────────────────────────────────────

class AppointmentDetailSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_code = serializers.CharField(source='patient.patient_code', read_only=True)
    patient_phone = serializers.CharField(source='patient.phone_primary', read_only=True)
    dentist_name = serializers.CharField(source='dentist.get_full_name', read_only=True)
    type_name = serializers.CharField(source='appointment_type.name', read_only=True)
    type_color = serializers.CharField(source='appointment_type.color', read_only=True)
    type_requires_anesthesia = serializers.BooleanField(
        source='appointment_type.requires_anesthesia', read_only=True
    )
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    start_time = serializers.TimeField(format='%H:%M')
    end_time = serializers.TimeField(format='%H:%M')

    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ('created_by', 'archived_at', 'archived_by', 'archive_reason', 'created_at', 'updated_at')


# ── Write serializer (create / update) ───────────────────────────────────────

class AppointmentWriteSerializer(serializers.ModelSerializer):
    reminder = serializers.UUIDField(write_only=True, required=False)
    class Meta:
        model = Appointment
        fields = [
            'patient', 'dentist', 'appointment_type',
            'scheduled_date', 'start_time', 'end_time', 'duration_minutes',
            'status', 'chief_complaint', 'pre_appointment_notes',
            'treatment_notes', 'cancellation_reason',
            'reminder',
        ]

    def validate_scheduled_date(self, value):
        if value < date.today() and not self.instance:
            raise serializers.ValidationError("Cannot schedule appointments in the past.")
        return value

    def validate_dentist(self, value):
        if value.role != 'dentist' or not value.is_active:
            raise serializers.ValidationError('Select an active eligible clinician.')
        return value

    def validate_duration_minutes(self, value):
        if value not in {15, 30, 45, 60, 90, 120}:
            raise serializers.ValidationError('Select a supported appointment duration.')
        return value

    def validate(self, data):
        reminder_id = data.get('reminder')
        if reminder_id:
            from clinical.models import RecallSchedule
            try:
                reminder = RecallSchedule.objects.select_related('linked_appointment').get(pk=reminder_id)
            except RecallSchedule.DoesNotExist:
                raise serializers.ValidationError({'reminder': 'Reminder not found.'})
            if reminder.status == 'booked' and reminder.linked_appointment_id:
                self._idempotent_appointment = reminder.linked_appointment
                return data
            if reminder.status != 'confirmed':
                raise serializers.ValidationError({'reminder': 'Only a confirmed reminder can be booked.'})
            patient = data.get('patient')
            if patient and reminder.patient_id != patient.pk:
                raise serializers.ValidationError({'patient': 'Appointment patient must match the reminder patient.'})
        # Resolve fields for partial updates
        def resolved(field, default=None):
            return data.get(field, getattr(self.instance, field, default))

        start = resolved('start_time')
        end = resolved('end_time')
        dentist = resolved('dentist')
        patient = resolved('patient')
        apt_date = resolved('scheduled_date')
        exclude = self.instance.pk if self.instance else None

        if start and end:
            if end <= start:
                raise serializers.ValidationError({'end_time': 'End time must be after start time.'})

            # Auto-compute duration_minutes if not provided
            if 'duration_minutes' not in data:
                dummy = date.today()
                delta = datetime.combine(dummy, end) - datetime.combine(dummy, start)
                data['duration_minutes'] = int(delta.total_seconds() / 60)
            elif int((datetime.combine(date.today(), end) - datetime.combine(date.today(), start)).total_seconds() / 60) != data['duration_minutes']:
                raise serializers.ValidationError({'end_time': 'End time must match start time and duration.'})

        if dentist and apt_date and start and end:
            # ── Dentist conflict ───────────────────────────────────────────────
            conflict = Appointment.has_conflict(dentist, apt_date, start, end, exclude_pk=exclude)
            if conflict:
                raise serializers.ValidationError({
                    'start_time': (
                        f"Dr. {dentist.get_full_name()} is already booked from "
                        f"{conflict.start_time.strftime('%H:%M')} to "
                        f"{conflict.end_time.strftime('%H:%M')} "
                        f"({conflict.appointment_type.name})."
                    )
                })

            # ── Patient conflict ───────────────────────────────────────────────
            if patient and Appointment.patient_has_conflict(patient, apt_date, start, end, exclude_pk=exclude):
                raise serializers.ValidationError({
                    'patient': 'This patient already has an appointment overlapping this time slot.'
                })

        return data

    def create(self, validated_data):
        reminder_id = validated_data.pop('reminder', None)
        if getattr(self, '_idempotent_appointment', None):
            return self._idempotent_appointment
        validated_data['created_by'] = self.context['request'].user
        if not reminder_id:
            return super().create(validated_data)
        from clinical.models import RecallSchedule
        from clinical.reminder_workflow import transition_reminder
        with transaction.atomic():
            reminder = RecallSchedule.objects.select_for_update().get(pk=reminder_id)
            if reminder.status == 'booked' and reminder.linked_appointment_id:
                return reminder.linked_appointment
            if reminder.status != 'confirmed':
                raise serializers.ValidationError({'reminder': 'Reminder is no longer confirmed.'})
            appointment = super().create(validated_data)
            transition_reminder(reminder, 'booked', self.context['request'].user,
                                appointment=appointment, request=self.context['request'])
            return appointment


# ── Status-only update ────────────────────────────────────────────────────────

class AppointmentStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Appointment.STATUS_CHOICES)
    cancellation_reason = serializers.CharField(required=False, allow_blank=True)
    treatment_notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data['status'] == 'cancelled' and not data.get('cancellation_reason'):
            raise serializers.ValidationError({'cancellation_reason': 'Required when cancelling.'})
        return data


# ── Waiting list ──────────────────────────────────────────────────────────────

class WaitingListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_phone = serializers.CharField(source='patient.phone_primary', read_only=True)
    dentist_name = serializers.CharField(source='preferred_dentist.get_full_name', read_only=True)
    type_name = serializers.CharField(source='appointment_type.name', read_only=True)
    type_color = serializers.CharField(source='appointment_type.color', read_only=True)
    wait_days = serializers.SerializerMethodField()

    class Meta:
        model = WaitingList
        fields = '__all__'
        read_only_fields = ('added_by', 'created_at', 'updated_at', 'scheduled_appointment')

    def get_wait_days(self, obj):
        return (date.today() - obj.created_at.date()).days

    def create(self, validated_data):
        validated_data['added_by'] = self.context['request'].user
        return super().create(validated_data)
