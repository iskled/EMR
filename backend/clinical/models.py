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
    NOTE_TYPE_CHOICES = [
        ('examination', 'Examination'),
        ('diagnosis', 'Diagnosis'),
        ('treatment', 'Treatment'),
        ('follow_up', 'Follow-up'),
        ('referral', 'Referral'),
        ('medication', 'Medication'),
        ('general', 'General'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.CASCADE, related_name='clinical_notes'
    )
   
    appointment_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True
    )

    dentist = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='clinical_notes'
    )
    note_type = models.CharField(
        max_length=20, choices=NOTE_TYPE_CHOICES, default='general', db_index=True
    )
    tooth_number = models.PositiveSmallIntegerField(
        choices=TOOTH_CHOICES, null=True, blank=True, db_index=True
    )

    # Structured fields
    chief_complaint = models.TextField(blank=True)
    clinical_findings = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    treatment_performed = models.TextField(blank=True)
    materials_used = models.TextField(blank=True)
    anesthesia_given = models.BooleanField(default=False)
    anesthesia_type = models.CharField(max_length=100, blank=True)
    next_visit_instructions = models.TextField(blank=True)

    # Free text
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
        tooth = f" T{self.tooth_number}" if self.tooth_number else ""
        return f"{self.get_note_type_display()}{tooth} – {self.note_date}"


# ── Clinical Image ────────────────────────────────────────────────────────────

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
