from rest_framework import serializers
from django.conf import settings
from pathlib import Path
from patients.models import PatientDocument


class PatientDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(
        source='uploaded_by.get_full_name',
        read_only=True
    )

    class Meta:
        model = PatientDocument
        fields = '__all__'
        read_only_fields = ('uploaded_by', 'file_size', 'mime_type', 'uploaded_at', 'is_archived', 'archived_at')

    def validate_file(self, value):
        allowed = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}
        if Path(value.name).suffix.lower() not in allowed:
            raise serializers.ValidationError('Unsupported file type.')
        limit = getattr(settings, 'PATIENT_DOCUMENT_MAX_SIZE', 10 * 1024 * 1024)
        if value.size > limit:
            raise serializers.ValidationError(f'File exceeds the configured {limit // (1024 * 1024)} MB limit.')
        return value
