from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0005_patientdailysequence'),
        ('inventory', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='stockmovement',
            name='patient_id',
            field=models.ForeignKey(
                blank=True,
                db_column='patient_id',
                db_index=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='inventory_movements',
                to='patients.patient',
            ),
        ),
        migrations.RenameField(
            model_name='stockmovement',
            old_name='patient_id',
            new_name='patient',
        ),
        migrations.AddIndex(
            model_name='stockmovement',
            index=models.Index(fields=['patient', 'created_at'], name='inventory_s_patient_f5fc9f_idx'),
        ),
    ]
