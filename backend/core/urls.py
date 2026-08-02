from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AuditEventViewSet,
    LoginAttemptViewSet,
    SecurityAlertViewSet,
    permission_matrix_view,
    security_dashboard,
    ClinicSettingsView,
)
from .dashboard_views import DashboardView

router = DefaultRouter()
router.register(r'audit-events', AuditEventViewSet, basename='audit-event')
router.register(r'security-alerts', SecurityAlertViewSet, basename='security-alert')
router.register(r'login-attempts', LoginAttemptViewSet, basename='login-attempt')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('settings/clinic/', ClinicSettingsView.as_view(), name='clinic-settings'),
    path('', include(router.urls)),
    path('security/dashboard/', security_dashboard, name='security-dashboard'),
    path('security/permission-matrix/', permission_matrix_view, name='permission-matrix'),
]
