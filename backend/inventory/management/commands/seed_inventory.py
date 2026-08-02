from django.core.management.base import BaseCommand
from django.utils.text import slugify

from inventory.models import InventoryCategory, InventoryLocation


CATEGORIES = [
    'Consumables',
    'Medicines',
    'Instruments',
    'Equipment',
    'Laboratory Materials',
    'Orthodontic Materials',
    'Implant Materials',
    'Office Supplies',
]

LOCATIONS = [
    ('main-store', 'Main Store'),
    ('surgery-1', 'Surgery 1'),
    ('sterilization', 'Sterilization Room'),
]


class Command(BaseCommand):
    help = 'Seed common dental inventory categories and storage locations.'

    def handle(self, *args, **options):
        category_count = 0
        for name in CATEGORIES:
            _, created = InventoryCategory.objects.get_or_create(
                code=slugify(name),
                defaults={'name': name, 'is_active': True},
            )
            if created:
                category_count += 1

        location_count = 0
        for code, name in LOCATIONS:
            _, created = InventoryLocation.objects.get_or_create(
                code=code,
                defaults={'name': name, 'is_active': True},
            )
            if created:
                location_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Seeded {category_count} categories and {location_count} locations.'
            )
        )
