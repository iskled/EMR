from django.core.management.base import BaseCommand

from appointments.models import AppointmentType


DEFAULT_TYPES = [
    {
        "name": "Consultation",
        "slug": "consultation",
        "default_duration": 30,
        "color": "#2563EB",
        "sort_order": 10,
        "description": "General examination or treatment planning consultation.",
    },
    {
        "name": "Cleaning",
        "slug": "cleaning",
        "default_duration": 45,
        "color": "#059669",
        "sort_order": 20,
        "description": "Routine scaling, polishing, and preventive care.",
    },
    {
        "name": "Restorative",
        "slug": "restorative",
        "default_duration": 60,
        "color": "#7C3AED",
        "sort_order": 30,
        "description": "Fillings and restorative dental treatment.",
    },
    {
        "name": "Extraction",
        "slug": "extraction",
        "default_duration": 60,
        "color": "#DC2626",
        "requires_anesthesia": True,
        "sort_order": 40,
        "description": "Simple or surgical extraction appointment.",
    },
    {
        "name": "Root Canal",
        "slug": "root-canal",
        "default_duration": 90,
        "color": "#EA580C",
        "requires_anesthesia": True,
        "sort_order": 50,
        "description": "Endodontic treatment appointment.",
    },
    {
        "name": "Orthodontic Review",
        "slug": "orthodontic-review",
        "default_duration": 30,
        "color": "#0891B2",
        "sort_order": 60,
        "description": "Routine orthodontic adjustment or review.",
    },
]


class Command(BaseCommand):
    help = "Seed useful appointment types when none exist."

    def handle(self, *args, **options):
        if AppointmentType.objects.exists():
            self.stdout.write(
                self.style.WARNING("Appointment types already exist; no seed data added.")
            )
            return

        AppointmentType.objects.bulk_create(
            AppointmentType(
                is_active=True,
                **{"requires_anesthesia": False, **appointment_type},
            )
            for appointment_type in DEFAULT_TYPES
        )

        self.stdout.write(
            self.style.SUCCESS(f"Seeded {len(DEFAULT_TYPES)} appointment types.")
        )
