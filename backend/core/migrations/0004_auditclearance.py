from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('core', '0003_clinicsettings'),
    ]
    operations = [
        migrations.CreateModel(
            name='AuditClearance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cleared_through', models.DateTimeField(db_index=True)),
                ('event_count', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('cleared_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_clearances', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'audit_clearances', 'ordering': ['-cleared_through']},
        ),
    ]
