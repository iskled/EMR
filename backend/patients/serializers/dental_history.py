from rest_framework import serializers
from patients.models import DentalHistory


class DentalHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DentalHistory
        fields = '__all__'
