from rest_framework import serializers

from .models import AuditEvent, LoginAttempt, SecurityAlert, ClinicSettings


class ClinicSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    class Meta:
        model = ClinicSettings
        exclude = ['updated_by']
        read_only_fields = ['updated_at']
    def validate_logo(self, value):
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Logo must be 5 MB or smaller.')
        if value and value.content_type not in ('image/png','image/jpeg'):
            raise serializers.ValidationError('Logo must be a PNG or JPG image.')
        return value
    def validate(self, attrs):
        for field in ('primary_colour','secondary_colour'):
            value=attrs.get(field)
            if value and (len(value)!=7 or not value.startswith('#')):
                raise serializers.ValidationError({field:'Use a hexadecimal colour such as #2563eb.'})
        return attrs
    def get_logo_url(self,obj):
        request=self.context.get('request')
        return request.build_absolute_uri(obj.logo.url) if obj.logo and request else None


class AuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = [
            'id', 'event_id', 'timestamp', 'user', 'user_email', 'user_role',
            'action', 'resource_type', 'resource_id', 'patient_id',
            'previous_values', 'new_values', 'request_method', 'endpoint',
            'ip_address', 'user_agent', 'correlation_id', 'success',
            'failure_reason', 'source_module', 'metadata', 'previous_hash',
            'event_hash',
        ]
        read_only_fields = fields


class SecurityAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityAlert
        fields = [
            'id', 'alert_type', 'severity', 'status', 'user', 'user_email',
            'message', 'source_module', 'metadata', 'acknowledged_by',
            'acknowledged_at', 'resolved_by', 'resolved_at', 'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class LoginAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginAttempt
        fields = [
            'id', 'email', 'user', 'success', 'failure_reason',
            'ip_address', 'user_agent', 'correlation_id', 'created_at',
        ]
        read_only_fields = fields
