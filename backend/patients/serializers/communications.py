from rest_framework import serializers
from patients.models import PatientCommunication

class PatientCommunicationSerializer(serializers.ModelSerializer):
    staff_member_name = serializers.CharField(source='staff_member.get_full_name', read_only=True)
    class Meta:
        model = PatientCommunication
        fields = '__all__'
        read_only_fields = ('staff_member', 'created_at')
