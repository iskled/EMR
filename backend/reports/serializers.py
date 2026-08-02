from rest_framework import serializers

from .models import SavedReport


class SavedReportSerializer(serializers.ModelSerializer):
    owner_email = serializers.CharField(source='owner.email', read_only=True)

    class Meta:
        model = SavedReport
        fields = '__all__'
        read_only_fields = ('owner', 'created_at', 'updated_at')


class ReportFilterSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    dentist = serializers.IntegerField(required=False)
    staff = serializers.IntegerField(required=False)
    staff_role = serializers.CharField(required=False)
    status = serializers.CharField(required=False)
    patient = serializers.UUIDField(required=False)
    appointment_type = serializers.IntegerField(required=False)
    inventory_category = serializers.IntegerField(required=False)
    inventory_location = serializers.IntegerField(required=False)
    supplier = serializers.IntegerField(required=False)
    orthodontic_stage = serializers.CharField(required=False)
