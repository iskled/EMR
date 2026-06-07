from datetime import date
from .models import Patient


def generate_patient_code():
    year = date.today().year
    prefix = f"PT-{year}-"

    last_patient = (
        Patient.objects.filter(patient_code__startswith=prefix)
        .order_by('-patient_code')
        .first()
    )

    if last_patient:
        try:
            last_num = int(last_patient.patient_code.split('-')[-1])
        except Exception:
            last_num = 0
    else:
        last_num = 0

    return f"{prefix}{last_num + 1:05d}"
