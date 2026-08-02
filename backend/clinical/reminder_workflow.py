from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from core.audit_service import audit_event
from .models import RecallSchedule

REMINDER_TYPE_LABELS = dict(RecallSchedule.RECALL_TYPE_CHOICES)
VISIT_TYPE_REMINDER_MAP = {
    "scaling": "scaling_polishing", "scaling_polishing": "scaling_polishing",
    "orthodontic": "orthodontic", "root_canal": "root_canal",
    "extraction": "extraction", "treatment": "treatment",
    "follow_up": "follow_up", "examination": "examination",
    "diagnosis": "diagnosis", "emergency": "emergency", "implant": "implant",
    "crown": "crown", "bridge": "bridge", "restoration": "restoration", "custom": "custom",
}
VALID_TRANSITIONS = {
    "active": {"contacted"}, "contacted": {"confirmed"},
    "confirmed": {"booked"}, "booked": {"completed", "confirmed"}, "completed": set(),
}


def reminder_type_for_visit(visit_type, text=""):
    normalized = (visit_type or "").lower().replace("&", "and").replace("-", "_").replace(" ", "_")
    haystack = f"{normalized} {text or ''}".lower()
    keywords = (("root canal", "root_canal"), ("extraction", "extraction"),
                ("implant", "implant"), ("crown", "crown"), ("bridge", "bridge"),
                ("restoration", "restoration"), ("emergency", "emergency"),
                ("scaling", "scaling_polishing"))
    specific = next((value for keyword, value in keywords if keyword in haystack), None)
    return specific or VISIT_TYPE_REMINDER_MAP.get(normalized, "custom")


def create_reminder(*, patient, due_date, reminder_type, interval_days, user, clinical_note=None, notes=""):
    existing = RecallSchedule.objects.filter(
        patient=patient, recall_type=reminder_type, due_date=due_date, archived_at__isnull=True
    ).exclude(status="cancelled").first()
    if existing:
        return existing, False
    reminder = RecallSchedule.objects.create(
        patient=patient, clinical_note=clinical_note, recall_type=reminder_type,
        due_date=due_date, preset="custom", interval_days=max(1, interval_days),
        notes=notes, created_by=user,
    )
    audit_event("reminder_created", "RecallSchedule", reminder.pk, user=user, patient_id=patient.pk,
                new_values={"status": reminder.status, "due_date": str(due_date), "recall_type": reminder_type},
                source_module="clinical")
    return reminder, True


def transition_reminder(reminder, new_status, user, appointment=None, request=None):
    old_status = reminder.status
    if new_status not in VALID_TRANSITIONS.get(old_status, set()):
        raise ValidationError({"status": f"Invalid reminder transition: {old_status} to {new_status}."})
    now = timezone.now()
    reminder.status = new_status
    fields = ["status", "updated_at"]
    if new_status == "contacted":
        reminder.contacted_at = now
        fields.append("contacted_at")
    elif new_status == "confirmed":
        reminder.confirmed_at = now
        fields.append("confirmed_at")
        if old_status == "booked":
            reminder.linked_appointment = reminder.booked_at = reminder.booked_by = None
            fields += ["linked_appointment", "booked_at", "booked_by"]
    elif new_status == "booked":
        if not appointment:
            raise ValidationError({"linked_appointment": "A linked appointment is required when booking."})
        if appointment.patient_id != reminder.patient_id:
            raise ValidationError({"linked_appointment": "Appointment patient does not match reminder patient."})
        reminder.linked_appointment, reminder.booked_at, reminder.booked_by = appointment, now, user
        fields += ["linked_appointment", "booked_at", "booked_by"]
    elif new_status == "completed":
        reminder.completed_at, reminder.completed_by = now, user
        fields += ["completed_at", "completed_by"]
    reminder.save(update_fields=fields)
    audit_event(f"reminder_{new_status}", "RecallSchedule", reminder.pk, request=request, user=user,
                patient_id=reminder.patient_id, previous_values={"status": old_status},
                new_values={"status": new_status, "appointment": str(appointment.pk) if appointment else ""},
                source_module="clinical")
    return reminder


@transaction.atomic
def complete_with_optional_recall(reminder, user, *, next_due_date=None, next_type=None, request=None):
    transition_reminder(reminder, "completed", user, request=request)
    if not next_due_date:
        return reminder, None
    interval = max(1, (next_due_date - timezone.localdate()).days)
    next_reminder, _ = create_reminder(
        patient=reminder.patient, due_date=next_due_date,
        reminder_type=next_type or reminder.recall_type, interval_days=interval,
        user=user, clinical_note=reminder.clinical_note,
        notes=f"Generated after completing reminder {reminder.pk}.")
    return reminder, next_reminder
