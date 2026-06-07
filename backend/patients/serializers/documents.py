from rest_framework import serializers
from patients.models import PatientDocument


class PatientDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(
        source='uploaded_by.get_full_name',
        read_only=True
    )

    file_url = serializers.SerializerMethodField()

    class Meta:
        model = PatientDocument
        fields = '__all__'

    def get_file_url(self, obj):
        request = self.context.get('request')

        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)

        return None
