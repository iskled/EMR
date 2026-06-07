from rest_framework import serializers
from patients.models import Allergy


class AllergySerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True
    )

    class Meta:
        model = Allergy
        fields = '__all__'
        read_only_fields = (
            'patient',
            'created_at',
            'created_by',
        )
