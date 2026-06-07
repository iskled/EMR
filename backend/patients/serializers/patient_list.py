from rest_framework import serializers
from patients.models import Patient


class PatientListSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()

    class Meta:
        model = Patient

        fields = [
            'id',
            'patient_code',
            'first_name',
            'last_name',
            'full_name',
            'age',
            'gender',
            'phone_primary',
            'email',
            'is_active',
        ]
