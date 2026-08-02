import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


# ── FDI tooth numbering helpers ───────────────────────────────────────────────

# FDI adult teeth: quadrant 1-4, tooth 1-8 → 11-18, 21-28, 31-38, 41-48
# FDI primary teeth: quadrant 5-8, tooth 1-5 → 51-55, 61-65, 71-75, 81-85
ADULT_TEETH = [
    11, 12, 13, 14, 15, 16, 17, 18,
    21, 22, 23, 24, 25, 26, 27, 28,
    31, 32, 33, 34, 35, 36, 37, 38,
    41, 42, 43, 44, 45, 46, 47, 48,
]
PRIMARY_TEETH = [
    51, 52, 53, 54, 55,
    61, 62, 63, 64, 65,
    71, 72, 73, 74, 75,
    81, 82, 83, 84, 85,
]
ALL_TEETH = ADULT_TEETH + PRIMARY_TEETH

TOOTH_CHOICES = [(t, str(t)) for t in ALL_TEETH]

SURFACE_CHOICES = [
    ('M', 'Mesial'),
    ('D', 'Distal'),
    ('O', 'Occlusal'),
    ('B', 'Buccal'),
    ('L', 'Lingual/Palatal'),
    ('I', 'Incisal'),
]

TOOTH_CONDITION_CHOICES = [
    ('healthy', 'Healthy'),
    ('caries', 'Caries'),
    ('filled', 'Filled'),
    ('crown', 'Crown'),
    ('missing', 'Missing'),
    ('implant', 'Implant'),
    ('bridge_anchor', 'Bridge Anchor'),
    ('bridge_pontic', 'Bridge Pontic'),
    ('rct', 'Root Canal Treated'),
    ('fractured', 'Fractured'),
    ('impacted', 'Impacted'),
    ('extracted', 'Extracted'),
    ('watch', 'Watch'),
]

SURFACE_CONDITION_CHOICES = [
    ('sound', 'Sound'),
    ('caries', 'Caries'),
    ('filled_composite', 'Filled – Composite'),
    ('filled_amalgam', 'Filled – Amalgam'),
    ('filled_ceramic', 'Filled – Ceramic'),
    ('watch', 'Watch / Stain'),
    ('sealant', 'Sealant'),
    ('worn', 'Worn / Attrition'),
]

def _upload_clinical_image(instance, filename):
    return f"clinical/{instance.patient_id}/images/{filename}"


# ── Tooth Chart ───────────────────────────────────────────────────────────────

class ToothChart(models.Model):
    """Master chart record per patient – created once, updated incrementally."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.OneToOneField(
        'patients.Patient', on_delete=models.CASCADE, related_name='tooth_chart'
    )
    dentition_type = models.CharField(
        max_length=10,
        choices=[('adult', 'Adult'), ('mixed', 'Mixed'), ('primary', 'Primary')],
        default='adult',
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tooth_charts'

    def __str__(self):
        return f"Chart – {self.patient.full_name}"


# ── Tooth Record ──────────────────────────────────────────────────────────────

class ToothRecord(models.Model):
    """One record per tooth per chart. Surface detail stored as JSON."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chart = models.ForeignKey(ToothChart, on_delete=models.CASCADE, related_name='teeth')
    tooth_number = models.PositiveSmallIntegerField(choices=TOOTH_CHOICES, db_index=True)
    condition = models.CharField(
        max_length=20, choices=TOOTH_CONDITION_CHOICES, default='healthy'
    )
    # JSON dict: {"M": "caries", "D": "filled_composite", ...}
    surface_conditions = models.JSONField(default=dict, blank=True)
    mobility_grade = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(3)],
        help_text="0–3 Miller mobility scale"
    )
    pocket_depth = models.JSONField(
        default=dict, blank=True,
        help_text="Dict of surface → mm, e.g. {'MB':4,'B':3,'DB':4,'ML':3,'L':2,'DL':3}"
    )
    furcation = models.CharField(
        max_length=5, blank=True,
        choices=[('', 'None'), ('I', 'Class I'), ('II', 'Class II'), ('III', 'Class III')]
    )
    notes = models.TextField(blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='+'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tooth_records'
        unique_together = [('chart', 'tooth_number')]
        ordering = ['tooth_number']

    def __str__(self):
        return f"Tooth {self.tooth_number} – {self.condition}"



# ── Treatment Plan ────────────────────────────────────────────────────────────

class TreatmentPlan(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('proposed', 'Proposed'),
        ('accepted', 'Accepted'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.CASCADE, related_name='treatment_plans'
    )
    dentist = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='treatment_plans', limit_choices_to={'role': 'dentist'}
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='draft', db_index=True)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'treatment_plans'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} – {self.patient.full_name}"

    @property
    def total_cost(self):
        return sum(
            i.unit_cost * i.quantity for i in self.items.all() if i.unit_cost
        )

    @property
    def completed_items(self):
        return self.items.filter(status='completed').count()

    @property
    def total_items(self):
        return self.items.count()


class TreatmentPlanItem(models.Model):
    ITEM_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('declined', 'Declined'),
    ]
    PRIORITY_CHOICES = [
        ('urgent', 'Urgent'),
        ('high', 'High'),
        ('normal', 'Normal'),
        ('elective', 'Elective'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(TreatmentPlan, on_delete=models.CASCADE, related_name='items')
    tooth_number = models.PositiveSmallIntegerField(
        choices=TOOTH_CHOICES, null=True, blank=True
    )
    surfaces = models.CharField(max_length=10, blank=True, help_text="e.g. MOD")
    procedure_name = models.CharField(max_length=200)
    procedure_code = models.CharField(max_length=20, blank=True, help_text="CDT / ADA code")
    quantity = models.PositiveSmallIntegerField(default=1)
    unit_cost = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    status = models.CharField(
        max_length=15, choices=ITEM_STATUS_CHOICES, default='pending', db_index=True
    )
    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default='normal'
    )
    notes = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'treatment_plan_items'
        ordering = ['sort_order', 'priority', 'tooth_number']

    def __str__(self):
        tooth = f" (T{self.tooth_number})" if self.tooth_number else ""
        return f"{self.procedure_name}{tooth}"


# ── Clinical Note ─────────────────────────────────────────────────────────────

class ClinicalNote(models.Model):
    TREATMENT_SCOPE_CHOICES = [('specific_teeth', 'Specific teeth'), ('whole_mouth', 'Whole mouth')]
    NOTE_TYPE_CHOICES = [
        ('examination', 'Examination'),
        ('diagnosis', 'Diagnosis'),
        ('treatment', 'Treatment'),
        ('follow_up', 'Follow-up'),
        ('referral', 'Referral'),
        ('medication', 'Medication'),
        ('general', 'General'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='clinical_notes'
    )

    appointment_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True
    )

    dentist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='clinical_notes',
        null=True,
        blank=True,
    )
    other_dentist_name = models.CharField(max_length=200, blank=True)

    note_type = models.CharField(
        max_length=20,
        choices=NOTE_TYPE_CHOICES,
        default='general',
        db_index=True
    )

    # Multi-tooth support
    tooth_numbers = models.JSONField(
        default=list,
        blank=True,
        help_text='Example: [22, 26, 36]'
    )
    treatment_scope = models.CharField(max_length=20, choices=TREATMENT_SCOPE_CHOICES, default='specific_teeth', db_index=True)

    # SUBJECTIVE
    chief_complaint = models.TextField(blank=True)
    family_social_history = models.TextField(blank=True)
    medical_dental_history = models.TextField(blank=True)

    # OBJECTIVE
    general_examination = models.TextField(blank=True)
    orofacial_examination = models.TextField(blank=True)
    clinical_findings = models.TextField(blank=True)

    # ASSESSMENT
    diagnosis = models.TextField(blank=True)

    # PLAN
    treatment_planned = models.TextField(blank=True)
    treatment_performed = models.TextField(blank=True)
    materials_used = models.TextField(blank=True)

    anesthesia_given = models.BooleanField(default=False)
    anesthesia_type = models.CharField(max_length=100, blank=True)
    next_visit_instructions = models.TextField(blank=True)

    notes = models.TextField(blank=True)

    is_signed = models.BooleanField(default=False)
    signed_at = models.DateTimeField(null=True, blank=True)

    note_date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'clinical_notes'
        ordering = ['-note_date', '-created_at']

    def __str__(self):
        teeth = (
            ",".join(map(str, self.tooth_numbers))
            if self.tooth_numbers
            else "General"
        )
        return f"{self.get_note_type_display()} T[{teeth}] – {self.note_date}"


class ClinicalImage(models.Model):
    IMAGE_TYPE_CHOICES = [
        ('periapical', 'Periapical X-ray'),
        ('bitewing', 'Bitewing X-ray'),
        ('panoramic', 'Panoramic X-ray'),
        ('cbct', 'CBCT / 3D Scan'),
        ('cephalometric', 'Cephalometric'),
        ('intraoral_photo', 'Intraoral Photo'),
        ('extraoral_photo', 'Extraoral Photo'),
        ('study_model', 'Study Model'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.CASCADE, related_name='clinical_images'
    )
    clinical_note = models.ForeignKey(
        ClinicalNote, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='images'
    )
  
    appointment_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True
    )


    tooth_number = models.PositiveSmallIntegerField(
        choices=TOOTH_CHOICES, null=True, blank=True
    )
    image_type = models.CharField(max_length=20, choices=IMAGE_TYPE_CHOICES, default='periapical')
    image = models.ImageField(upload_to=_upload_clinical_image)
    caption = models.CharField(max_length=300, blank=True)
    taken_at = models.DateField()
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'clinical_images'
        ordering = ['-taken_at', '-created_at']

    def __str__(self):
        tooth = f" T{self.tooth_number}" if self.tooth_number else ""
        return f"{self.get_image_type_display()}{tooth} – {self.taken_at}"

class RecallSchedule(models.Model):
    PRESET_CHOICES = [('six_weeks', '6 weeks'), ('six_months', '6 months'), ('custom', 'Custom date')]
    RECALL_TYPE_CHOICES = [
        ('scaling_polishing', 'Scaling & Polishing Recall'),
        ('orthodontic', 'Orthodontic Review'),
        ('root_canal', 'Root Canal Review'),
        ('extraction', 'Extraction Review'),
        ('treatment', 'Treatment Review'),
        ('follow_up', 'Follow-up'),
        ('examination', 'Recall Examination'),
        ('diagnosis', 'Diagnosis Review'),
        ('emergency', 'Emergency Review'),
        ('implant', 'Implant Review'),
        ('crown', 'Crown Review'),
        ('bridge', 'Bridge Review'),
        ('restoration', 'Restoration Review'),
        ('custom', 'Custom Review'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('contacted', 'Contacted'),
        ('confirmed', 'Confirmed'),
        ('booked', 'Booked'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='recall_schedules'
    )

    clinical_note = models.ForeignKey(
        ClinicalNote,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recall_schedules'
    )

    recall_type = models.CharField(
        max_length=30,
        choices=RECALL_TYPE_CHOICES
    )

    due_date = models.DateField(db_index=True)
    preset = models.CharField(max_length=20, choices=PRESET_CHOICES, default='custom')

    interval_days = models.PositiveIntegerField(
        help_text="180 = 6 months, 42 = 6 weeks, 56 = 8 weeks"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )

    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='+'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    contacted_at = models.DateTimeField(null=True, blank=True)
    contacted_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    contact_history = models.JSONField(default=list, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    snoozed_until = models.DateField(null=True, blank=True)
    linked_appointment = models.OneToOneField('appointments.Appointment', null=True, blank=True, on_delete=models.SET_NULL, related_name='recall_schedule')
    booked_at = models.DateTimeField(null=True, blank=True)
    booked_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    archived_at = models.DateTimeField(null=True, blank=True, db_index=True)
    archived_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    archived_reason = models.CharField(max_length=255, blank=True)
    restored_at = models.DateTimeField(null=True, blank=True)
    restored_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    rescheduled_at = models.DateTimeField(null=True, blank=True)
    rescheduled_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    reschedule_reason = models.CharField(max_length=255, blank=True)
    reschedule_history = models.JSONField(default=list, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    cancellation_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'recall_schedules'
        ordering = ['due_date']

    def __str__(self):
        return (
            f"{self.patient.full_name} - "
            f"{self.recall_type} - "
            f"{self.due_date}"
        )
    

class ClinicalTemplate(models.Model):


    TEMPLATE_TYPES = [
        ('chief_complaint', 'Chief Complaint'),
        ('medical_dental_history', 'Medical / Dental History'),
        ('family_social_history', 'Family / Social History'),
        ('clinical_findings', 'Clinical Findings'),
        ('general_examination', 'General Examination'),
        ('orofacial_examination', 'Orofacial Examination'),
        ('diagnosis', 'Diagnosis'),
        ('treatment_planned', 'Treatment Planned'),
        ('treatment_performed', 'Treatment Performed'),
        ('materials_used', 'Materials Used'),
        ('next_visit_instructions', 'Next Visit Instructions'),
    ]

    SOURCE_CHOICES = [
        ('manual', 'Manual'),
        ('auto', 'Auto Learned'),
    ]

    template_type = models.CharField(
        max_length=100,
        choices=TEMPLATE_TYPES
    )

    label = models.CharField(max_length=255)
    content = models.TextField(blank=True)

    specialty = models.CharField(
        max_length=100,
        blank=True
    )

    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default='manual'
    )

    usage_count = models.IntegerField(default=1)
    last_used = models.DateTimeField(auto_now=True)

    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = [
            'template_type',
            '-usage_count',
            '-last_used',
            'sort_order',
            'label'
        ]

    def __str__(self):
        return f"{self.template_type} - {self.label}"
    

def _upload_orthodontic_photo(instance, filename):
    return f"orthodontics/{instance.ortho_case_id}/photos/{filename}"


def _upload_orthodontic_document(instance, filename):
    return f"orthodontics/{instance.ortho_case_id}/documents/{filename}"


class OrthodonticCase(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('retention', 'Retention'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
        ('archived', 'Archived'),
    ]

    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='ortho_cases'
    )

    diagnosis = models.TextField(blank=True)
    malocclusion_classification = models.CharField(max_length=100, blank=True)
    chief_complaint = models.TextField(blank=True)
    treatment_objectives = models.TextField(blank=True)
    treatment_plan = models.TextField(blank=True)
    estimated_duration_months = models.PositiveSmallIntegerField(default=18)
    clinical_notes = models.TextField(blank=True)

    appliance_type = models.CharField(max_length=100, blank=True)
    stage = models.CharField(max_length=100, blank=True, default='Initial Consultation')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    start_date = models.DateField()
    estimated_completion = models.DateField(null=True, blank=True)

    measurements = models.JSONField(default=dict, blank=True)
    appliances = models.JSONField(default=dict, blank=True)
    milestones = models.JSONField(default=list, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def completed_visit_count(self):
        return self.visits.count()

    @property
    def progress_percent(self):
        if self.status == 'completed':
            return 100
        if not self.milestones:
            return min(self.completed_visit_count * 5, 95)
        completed = len([item for item in self.milestones if item.get('completed')])
        return round((completed / len(self.milestones)) * 100) if self.milestones else 0

    def __str__(self):
        return f"Orthodontics - {self.patient.full_name}"


class OrthodonticVisit(models.Model):
    COMPLIANCE_CHOICES = [
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('poor', 'Poor'),
    ]

    VISIT_TYPE_CHOICES = [
        ('consultation', 'Consultation'),
        ('records', 'Diagnostic Records'),
        ('bonding', 'Bonding'),
        ('adjustment', 'Adjustment'),
        ('wire_change', 'Wire Change'),
        ('elastic_review', 'Elastic Review'),
        ('repair', 'Appliance Repair'),
        ('debond', 'Debond'),
        ('retention', 'Retention Review'),
        ('review', 'Review'),
        ('completed', 'Completed'),
    ]

    ortho_case = models.ForeignKey(
        OrthodonticCase,
        on_delete=models.CASCADE,
        related_name='visits'
    )

    dentist = models.ForeignKey(
        'authentication.User',
        null=True,
        on_delete=models.SET_NULL
    )

    visit_date = models.DateField()
    visit_type = models.CharField(max_length=30, choices=VISIT_TYPE_CHOICES, default='adjustment')

    upper_wire = models.CharField(max_length=100, blank=True)
    lower_wire = models.CharField(max_length=100, blank=True)

    procedures = models.JSONField(default=list)
    procedures_performed = models.TextField(blank=True)
    measurements = models.JSONField(default=dict, blank=True)
    appliance_changes = models.JSONField(default=dict, blank=True)

    compliance = models.CharField(
        max_length=20,
        choices=COMPLIANCE_CHOICES,
        blank=True
    )

    notes = models.TextField(blank=True)
    clinical_notes = models.TextField(blank=True)
    next_review_days = models.IntegerField(default=42)
    next_review_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-visit_date', '-created_at']

    def __str__(self):
        return f"{self.get_visit_type_display()} - {self.ortho_case.patient.full_name}"


class OrthodonticPhoto(models.Model):
    PHOTO_TYPE_CHOICES = [
        ('before', 'Before'),
        ('progress', 'Progress'),
        ('after', 'After'),
        ('intraoral', 'Intraoral'),
        ('extraoral', 'Extraoral'),
        ('radiograph', 'Radiograph'),
        ('other', 'Other'),
    ]

    ortho_case = models.ForeignKey(
        OrthodonticCase,
        on_delete=models.CASCADE,
        related_name='photos'
    )
    visit = models.ForeignKey(
        OrthodonticVisit,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='photos'
    )
    photo_type = models.CharField(max_length=20, choices=PHOTO_TYPE_CHOICES, default='progress')
    image = models.ImageField(upload_to=_upload_orthodontic_photo)
    caption = models.CharField(max_length=300, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    taken_at = models.DateField()
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-taken_at', '-created_at']


class OrthodonticDocument(models.Model):
    DOCUMENT_TYPE_CHOICES = [
        ('consent', 'Treatment Consent'),
        ('treatment_plan', 'Treatment Plan'),
        ('referral', 'Referral Letter'),
        ('radiograph', 'Radiograph'),
        ('study_model', 'Study Model'),
        ('cephalometric', 'Cephalometric Analysis'),
        ('photograph', 'Photograph'),
        ('pdf', 'PDF'),
        ('other', 'Other'),
    ]

    ortho_case = models.ForeignKey(
        OrthodonticCase,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPE_CHOICES)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to=_upload_orthodontic_document)
    version = models.PositiveSmallIntegerField(default=1)
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
