from django.db import transaction
from django.utils import timezone
from .models import PatientDailySequence


def generate_patient_code(registration_date=None):
    registration_date = registration_date or timezone.localdate()
    with transaction.atomic():
        sequence, _ = PatientDailySequence.objects.select_for_update().get_or_create(sequence_date=registration_date)
        sequence.last_sequence += 1
        if sequence.last_sequence > 99:
            raise ValueError('Daily patient registration limit reached.')
        sequence.save(update_fields=['last_sequence'])
        return f'{registration_date:%Y%m%d}{sequence.last_sequence:02d}'
