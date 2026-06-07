from django.contrib import admin
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        'patient_code',
        'first_name',
        'last_name',
        'phone_primary',
        'is_active',
    )

    search_fields = (
        'patient_code',
        'first_name',
        'last_name',
        'phone_primary',
    )

    list_filter = (
        'is_active',
    )