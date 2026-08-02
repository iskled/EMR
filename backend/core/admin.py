from django.contrib import admin

from .models import AuditEvent, AuditLog, LoginAttempt, SecurityAlert


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'user', 'action', 'model_name', 'object_id']
    list_filter = ['action', 'model_name']
    search_fields = ['object_id', 'object_repr', 'user__email']


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'user_email', 'action', 'resource_type', 'resource_id', 'success']
    list_filter = ['success', 'action', 'resource_type', 'source_module']
    search_fields = ['event_id', 'user_email', 'resource_id', 'endpoint']
    readonly_fields = [field.name for field in AuditEvent._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SecurityAlert)
class SecurityAlertAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'alert_type', 'severity', 'status', 'user_email', 'message']
    list_filter = ['status', 'severity', 'alert_type']
    search_fields = ['message', 'user_email']


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'email', 'success', 'failure_reason', 'ip_address']
    list_filter = ['success', 'failure_reason']
    search_fields = ['email', 'ip_address']
