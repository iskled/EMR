from django.core.management.base import BaseCommand

from tasks.models import ChecklistTemplate, ChecklistTemplateItem


TEMPLATES = [
    {
        'name': 'Daily Front Desk Close',
        'task_type': 'administrative',
        'items': ['Confirm tomorrow appointments', 'Review unassigned tasks', 'Check unresolved alerts'],
    },
    {
        'name': 'Clinical Follow-up',
        'task_type': 'clinical',
        'items': ['Review patient record', 'Confirm treatment notes', 'Schedule recall if required'],
    },
    {
        'name': 'Orthodontic Review Prep',
        'task_type': 'orthodontic',
        'items': ['Review last measurements', 'Confirm next appointment', 'Check appliance notes'],
    },
    {
        'name': 'Inventory Reorder',
        'task_type': 'inventory',
        'items': ['Verify stock balance', 'Check supplier history', 'Create purchase request'],
    },
]


class Command(BaseCommand):
    help = 'Seed default task checklist templates.'

    def handle(self, *args, **options):
        created = 0
        for template_data in TEMPLATES:
            template, was_created = ChecklistTemplate.objects.get_or_create(
                name=template_data['name'],
                defaults={'task_type': template_data['task_type'], 'is_active': True},
            )
            if was_created:
                created += 1
            for index, title in enumerate(template_data['items']):
                ChecklistTemplateItem.objects.get_or_create(
                    template=template,
                    title=title,
                    defaults={'sort_order': index, 'is_required': True},
                )
        self.stdout.write(self.style.SUCCESS(f'Seeded task checklist templates. Created {created}.'))
