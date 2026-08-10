from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('tasks', '0004_taskprogressupdate_event_type_and_more')]
    operations = [
        migrations.AddField(model_name='taskprogressupdate', name='previous_percentage', field=models.PositiveSmallIntegerField(blank=True, null=True)),
        migrations.AddField(model_name='taskprogressupdate', name='new_percentage', field=models.PositiveSmallIntegerField(blank=True, null=True)),
    ]
