import uuid
from datetime import date, datetime, timedelta
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class AppointmentType(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    default_duration = models.PositiveSmallIntegerField(default=30, help_text="Minutes")
    color = models.CharField(max_length=7, default='#3B82F6', help_text="Hex colour for calendar")
    requires_anesthesia = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'appointment_types'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class Appointment(models.Model):
    STATUS_SCHEDULED = 'scheduled'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_NO_SHOW = 'no_show'

    STATUS_CHOICES = [
        (STATUS_SCHEDULED, 'Scheduled'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
        (STATUS_NO_SHOW, 'No Show'),
    ]

    # Statuses that occupy the dentist's chair (prevent double-booking)
    ACTIVE_STATUSES = [STATUS_SCHEDULED, STATUS_CONFIRMED, STATUS_IN_PROGRESS]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.PROTECT, related_name='appointments'
    )
    dentist = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='appointments', limit_choices_to={'role': 'dentist'}
    )
    appointment_type = models.ForeignKey(
        AppointmentType, on_delete=models.PROTECT, related_name='appointments'
    )

    scheduled_date = models.DateField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    duration_minutes = models.PositiveSmallIntegerField()

    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES, default=STATUS_SCHEDULED, db_index=True
    )

    chief_complaint = models.TextField(blank=True)
    pre_appointment_notes = models.TextField(blank=True)
    treatment_notes = models.TextField(blank=True)
    cancellation_reason = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_appointments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'appointments'
        ordering = ['scheduled_date', 'start_time']
        indexes = [
            models.Index(fields=['scheduled_date', 'dentist']),
            models.Index(fields=['patient', 'scheduled_date']),
            models.Index(fields=['dentist', 'status']),
        ]

    def __str__(self):
        return (
            f"{self.patient.full_name} – {self.appointment_type.name} "
            f"on {self.scheduled_date} at {self.start_time}"
        )

    @property
    def is_active(self):
        return self.status in self.ACTIVE_STATUSES

    def clean(self):
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValidationError({'end_time': 'End time must be after start time.'})

    @classmethod
    def has_conflict(cls, dentist, apt_date, start_time, end_time, exclude_pk=None):
        """Return True if dentist is already booked in the given time window."""
        qs = cls.objects.filter(
            dentist=dentist,
            scheduled_date=apt_date,
            status__in=cls.ACTIVE_STATUSES,
            start_time__lt=end_time,
            end_time__gt=start_time,
        )
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
        return qs.first()

    @classmethod
    def patient_has_conflict(cls, patient, apt_date, start_time, end_time, exclude_pk=None):
        qs = cls.objects.filter(
            patient=patient,
            scheduled_date=apt_date,
            status__in=cls.ACTIVE_STATUSES,
            start_time__lt=end_time,
            end_time__gt=start_time,
        )
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
        return qs.exists()


class WaitingList(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'), ('normal', 'Normal'), ('high', 'High'), ('urgent', 'Urgent'),
    ]
    STATUS_CHOICES = [
        ('waiting', 'Waiting'), ('scheduled', 'Scheduled'),
        ('expired', 'Expired'), ('cancelled', 'Cancelled'),
    ]

    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.CASCADE, related_name='waiting_list_entries'
    )
    preferred_dentist = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='waiting_patients', limit_choices_to={'role': 'dentist'}
    )
    appointment_type = models.ForeignKey(AppointmentType, on_delete=models.PROTECT)

    preferred_days = models.JSONField(default=list, help_text="e.g. ['monday', 'wednesday']")
    preferred_time_from = models.TimeField(null=True, blank=True)
    preferred_time_to = models.TimeField(null=True, blank=True)

    notes = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal', db_index=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='waiting', db_index=True)

    scheduled_appointment = models.OneToOneField(
        Appointment, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='from_waiting_list'
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'waiting_list'
        ordering = [
            models.Case(
                models.When(priority='urgent', then=0),
                models.When(priority='high', then=1),
                models.When(priority='normal', then=2),
                models.When(priority='low', then=3),
                default=4,
            ),
            'created_at',
        ]

    def __str__(self):
        return f"Waiting: {self.patient.full_name} – {self.appointment_type.name}"
