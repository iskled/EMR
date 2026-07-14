import uuid
from datetime import date
from django.db import models
from django.conf import settings


def _upload_patient_photo(instance, filename):
    ext = filename.rsplit('.', 1)[-1]
    return f"patients/photos/{instance.patient_code}.{ext}"


def _upload_patient_doc(instance, filename):
    return f"patients/documents/{instance.patient.patient_code}/{filename}"


class Patient(models.Model):
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]
    BLOOD_TYPE_CHOICES = [
        ('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'),
        ('AB+', 'AB+'), ('AB-', 'AB-'), ('O+', 'O+'), ('O-', 'O-'), ('Unknown', 'Unknown'),
    ]
    REFERRAL_SOURCES = [
    ('facebook', 'Facebook'),
    ('passing_by', 'Passing By'),
    ('instagram', 'Instagram'),
    ('google', 'Google'),
    ('friends', 'Friends'),
    ('others', 'Others'),
]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient_code = models.CharField(max_length=20, unique=True, db_index=True)

    # Personal
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    blood_type = models.CharField(max_length=10, choices=BLOOD_TYPE_CHOICES, default='Unknown')
    national_id = models.CharField(max_length=50, blank=True, null=True, unique=True)
    profile_photo = models.ImageField(upload_to=_upload_patient_photo, blank=True, null=True)

    # Contact
    email = models.EmailField(blank=True)
    phone_primary = models.CharField(max_length=20)
    phone_secondary = models.CharField(max_length=20, blank=True)
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state_province = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    nationality = models.CharField(max_length=100, blank=True, default='')
        # CRM / Marketing
    referral_source = models.CharField(
        max_length=50,
        choices=REFERRAL_SOURCES,
        blank=True,
    )

    social_media = models.CharField(
        max_length=100,
        blank=True,
    )

    wants_reminder = models.BooleanField(default=False)


    PATIENT_CATEGORY_CHOICES = [
        ('general', 'General Dentistry'),
        ('orthodontic', 'Orthodontic'),
        ('both', 'General + Orthodontic'),
    ]

    REMINDER_METHOD_CHOICES = [
        ('sms', 'SMS'),
        ('whatsapp', 'WhatsApp'),
        ('call', 'Phone Call'),
        ('email', 'Email'),
    ]

    patient_category = models.CharField(
        max_length=20,
        choices=PATIENT_CATEGORY_CHOICES,
        default='general'
    )

    preferred_reminder_method = models.CharField(
        max_length=20,
        choices=REMINDER_METHOD_CHOICES,
        blank=True
    )

    ortho_interval_weeks = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Usually 6 or 8 weeks for braces patients"
    )


    # Intake
    occupation = models.CharField(
        max_length=100,
        blank=True,
    )

    blood_pressure = models.CharField(
        max_length=20,
        blank=True,
    )

    temperature = models.CharField(
        max_length=20,
        blank=True,
    )

    signature = models.ImageField(
        upload_to='patients/signatures/',
        blank=True,
        null=True,
    )

    xray_collected = models.BooleanField(default=False)

        
    # Emergency contact
    emergency_contact_name = models.CharField(max_length=200, blank=True)
    emergency_contact_relationship = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)

    # Admin
    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='registered_patients'
    )
    assigned_dentist = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_patients',
        limit_choices_to={'role': 'dentist'}
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'patients'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['last_name', 'first_name']),
            models.Index(fields=['phone_primary']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.patient_code} – {self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self):
        today = date.today()
        return (
            today.year - self.date_of_birth.year
            - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
        )


class MedicalHistory(models.Model):
    DIABETES_CHOICES = [('none', 'None'), ('type1', 'Type 1'), ('type2', 'Type 2'), ('pre', 'Pre-diabetic')]
    HEPATITIS_CHOICES = [('none', 'None'), ('A', 'A'), ('B', 'B'), ('C', 'C')]

    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='medical_history')

    # Systemic conditions
    hypertension = models.BooleanField(default=False)
    diabetes = models.CharField(max_length=10, choices=DIABETES_CHOICES, default='none')
    heart_disease = models.BooleanField(default=False)
    heart_disease_details = models.TextField(blank=True)
    bleeding_disorder = models.BooleanField(default=False)
    bleeding_disorder_details = models.TextField(blank=True)
    epilepsy = models.BooleanField(default=False)
    hepatitis = models.CharField(max_length=5, choices=HEPATITIS_CHOICES, default='none')
    hiv_positive = models.BooleanField(default=False)
    respiratory_conditions = models.TextField(blank=True)
    kidney_disease = models.BooleanField(default=False)
    thyroid_conditions = models.TextField(blank=True)
    osteoporosis = models.BooleanField(default=False)

    # Medications
    current_medications = models.TextField(blank=True)
    on_blood_thinners = models.BooleanField(default=False)
    on_bisphosphonates = models.BooleanField(default=False)

    # Pregnancy
    is_pregnant = models.BooleanField(default=False)
    pregnancy_weeks = models.PositiveSmallIntegerField(null=True, blank=True)

    # Other
    other_conditions = models.TextField(blank=True)
    previous_surgeries = models.TextField(blank=True)
    family_history = models.TextField(blank=True)

    last_updated = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        db_table = 'patient_medical_history'

    def __str__(self):
        return f"Medical History – {self.patient.full_name}"


class DentalHistory(models.Model):
    BRUSHING_CHOICES = [
        ('once', 'Once daily'), ('twice', 'Twice daily'),
        ('three', '3× daily'), ('rarely', 'Rarely'),
    ]
    FLOSSING_CHOICES = [
        ('daily', 'Daily'), ('weekly', 'Weekly'),
        ('monthly', 'Monthly'), ('never', 'Never'),
    ]

    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='dental_history')

    previous_dentist = models.CharField(max_length=200, blank=True)
    last_visit_date = models.DateField(null=True, blank=True)
    chief_complaint = models.TextField(blank=True)

    # Previous treatments
    prev_extractions = models.BooleanField(default=False)
    prev_orthodontics = models.BooleanField(default=False)
    prev_implants = models.BooleanField(default=False)
    prev_root_canal = models.BooleanField(default=False)
    prev_dentures = models.BooleanField(default=False)
    prev_whitening = models.BooleanField(default=False)
    prev_treatment_details = models.TextField(blank=True)

    # Symptoms
    pain_sensitivity = models.BooleanField(default=False)
    sensitivity_details = models.TextField(blank=True)
    bleeding_gums = models.BooleanField(default=False)
    dry_mouth = models.BooleanField(default=False)
    jaw_pain = models.BooleanField(default=False)

    # Oral hygiene
    brushing_frequency = models.CharField(max_length=10, choices=BRUSHING_CHOICES, default='twice')
    flossing_frequency = models.CharField(max_length=10, choices=FLOSSING_CHOICES, default='weekly')
    uses_mouthwash = models.BooleanField(default=False)
    uses_electric_toothbrush = models.BooleanField(default=False)

    # Habits
    is_smoker = models.BooleanField(default=False)
    smoking_years = models.PositiveSmallIntegerField(null=True, blank=True)
    consumes_alcohol = models.BooleanField(default=False)
    grinds_teeth = models.BooleanField(default=False)
    nail_biting = models.BooleanField(default=False)

    additional_notes = models.TextField(blank=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'patient_dental_history'

    def __str__(self):
        return f"Dental History – {self.patient.full_name}"


class Allergy(models.Model):
    SEVERITY = [('mild', 'Mild'), ('moderate', 'Moderate'), ('severe', 'Severe')]
    ALLERGY_TYPE = [
        ('drug', 'Drug'), ('latex', 'Latex'), ('food', 'Food'),
        ('anesthesia', 'Anesthesia'), ('metal', 'Metal'), ('other', 'Other'),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='allergies')
    allergy_type = models.CharField(max_length=20, choices=ALLERGY_TYPE)
    substance = models.CharField(max_length=200)
    reaction = models.CharField(max_length=500)
    severity = models.CharField(max_length=10, choices=SEVERITY)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        db_table = 'patient_allergies'
        verbose_name_plural = 'Allergies'
        ordering = ['-severity']

    def __str__(self):
        return f"{self.patient.full_name} – {self.substance} ({self.severity})"


class PatientDocument(models.Model):
    DOC_TYPE = [
        ('xray', 'X-Ray'), ('photo', 'Clinical Photo'), ('consent', 'Consent Form'),
        ('id', 'ID Document'), ('insurance', 'Insurance'), ('lab', 'Lab Report'),
        ('referral', 'Referral'), ('prescription', 'Prescription'), ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=20, choices=DOC_TYPE)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to=_upload_patient_doc)
    file_size = models.PositiveBigIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'patient_documents'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.patient.full_name} – {self.title}"

    def save(self, *args, **kwargs):
        if self.file:
            try:
                self.file_size = self.file.size
            except Exception:
                pass
        super().save(*args, **kwargs)


