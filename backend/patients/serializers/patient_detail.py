from rest_framework import serializers

from patients.models import Patient
from .medical_history import MedicalHistorySerializer
from .dental_history import DentalHistorySerializer
from .allergy import AllergySerializer
from .documents import PatientDocumentSerializer


class PatientDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()

    medical_history = MedicalHistorySerializer(read_only=True)
    dental_history = DentalHistorySerializer(read_only=True)

    allergies = AllergySerializer(many=True, read_only=True)
    documents = PatientDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Patient
        fields = '__all__'
