import csv
from io import StringIO

from django.db.models import Count
from django.http import HttpResponse
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .audit_service import audit_event
from .models import AuditClearance, AuditEvent, LoginAttempt, SecurityAlert, ClinicSettings
from .permissions import AdminOnlyPermission, has_permission, permission_matrix
from .serializers import AuditEventSerializer, LoginAttemptSerializer, SecurityAlertSerializer, ClinicSettingsSerializer


class ClinicSettingsView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    def get_object(self):
        return ClinicSettings.objects.get_or_create(pk=1)[0]
    def get(self, request):
        return Response(ClinicSettingsSerializer(self.get_object(), context={'request':request}).data)
    def patch(self, request):
        if request.user.role != 'admin':
            return Response({'detail':'Administrator access required.'}, status=status.HTTP_403_FORBIDDEN)
        instance=self.get_object(); serializer=ClinicSettingsSerializer(instance,data=request.data,partial=True,context={'request':request}); serializer.is_valid(raise_exception=True); serializer.save(updated_by=request.user)
        audit_event('clinic_branding_updated','ClinicSettings',instance.pk,request=request,user=request.user,new_values=serializer.data,source_module='settings')
        return Response(serializer.data)


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditEventSerializer
    permission_classes = [AdminOnlyPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'user_role', 'action', 'source_module', 'resource_type', 'patient_id', 'success']
    search_fields = ['user_email', 'resource_id', 'endpoint', 'failure_reason']
    ordering_fields = ['timestamp', 'action', 'resource_type', 'success']
    ordering = ['-timestamp']

    def get_queryset(self):
        qs = AuditEvent.objects.select_related('user')
        latest_clearance = AuditClearance.objects.order_by('-cleared_through').first()
        if latest_clearance:
            qs = qs.filter(timestamp__gt=latest_clearance.cleared_through)
        start = self.request.query_params.get('start_date')
        end = self.request.query_params.get('end_date')
        if start:
            qs = qs.filter(timestamp__date__gte=start)
        if end:
            qs = qs.filter(timestamp__date__lte=end)
        return qs

    @action(detail=False, methods=['post'], url_path='clear')
    def clear(self, request):
        if request.data.get('confirmation') != 'CLEAR':
            return Response({'confirmation': 'Enter CLEAR to clear all audit logs from the active view.'}, status=400)
        event_count = self.get_queryset().count()
        audit_event(
            'audit_logs_cleared', 'AuditEvent', request=request, source_module='audit',
            metadata={'cleared_event_count': event_count, 'retention': 'append_only'},
        )
        clearance = AuditClearance.objects.create(
            cleared_through=timezone.now(), cleared_by=request.user, event_count=event_count,
        )
        return Response({'cleared': event_count, 'cleared_through': clearance.cleared_through})

    @action(detail=False, methods=['get'])
    def metrics(self, request):
        qs = self.get_queryset()
        return Response({
            'total_events': qs.count(),
            'failed_events': qs.filter(success=False).count(),
            'exports': qs.filter(action__icontains='export').count(),
            'access_denied': qs.filter(action='access_denied').count(),
            'login_success': qs.filter(action='login_success').count(),
            'login_failure': qs.filter(action='login_failure').count(),
            'by_action': list(qs.values('action').annotate(count=Count('id')).order_by('-count')[:20]),
            'by_module': list(qs.values('source_module').annotate(count=Count('id')).order_by('-count')[:20]),
        })

    @action(detail=False, methods=['get'])
    def export(self, request):
        if not has_permission(request.user, 'audit.export'):
            return Response({'detail': 'Not permitted.'}, status=403)
        rows = list(self.get_queryset()[:5000])
        buffer = StringIO()
        fields = ['event_id', 'timestamp', 'user_email', 'user_role', 'action', 'resource_type', 'resource_id', 'patient_id', 'request_method', 'endpoint', 'success', 'failure_reason', 'source_module', 'correlation_id']
        writer = csv.DictWriter(buffer, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: getattr(row, field) for field in fields})
        audit_event('audit_export', 'AuditEvent', request=request, source_module='audit', metadata={'row_count': len(rows)})
        response = HttpResponse(buffer.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit-events.csv"'
        return response


class SecurityAlertViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SecurityAlertSerializer
    permission_classes = [AdminOnlyPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['alert_type', 'severity', 'status', 'user', 'source_module']
    search_fields = ['message', 'user_email']
    ordering = ['-created_at']

    def get_queryset(self):
        return SecurityAlert.objects.select_related('user', 'acknowledged_by', 'resolved_by')

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'acknowledged'
        alert.acknowledged_by = request.user
        alert.acknowledged_at = timezone.now()
        alert.save(update_fields=['status', 'acknowledged_by', 'acknowledged_at', 'updated_at'])
        audit_event('security_alert_acknowledged', 'SecurityAlert', alert.pk, request=request, source_module='security')
        return Response(self.get_serializer(alert).data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'resolved'
        alert.resolved_by = request.user
        alert.resolved_at = timezone.now()
        alert.save(update_fields=['status', 'resolved_by', 'resolved_at', 'updated_at'])
        audit_event('security_alert_resolved', 'SecurityAlert', alert.pk, request=request, source_module='security')
        return Response(self.get_serializer(alert).data)


class LoginAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LoginAttemptSerializer
    permission_classes = [AdminOnlyPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['email', 'success', 'user']
    search_fields = ['email', 'failure_reason']
    ordering = ['-created_at']

    def get_queryset(self):
        return LoginAttempt.objects.select_related('user')


@api_view(['GET'])
@permission_classes([AdminOnlyPermission])
def security_dashboard(request):
    since = timezone.now() - timezone.timedelta(days=7)
    return Response({
        'open_alerts': SecurityAlert.objects.filter(status='open').count(),
        'critical_alerts': SecurityAlert.objects.filter(status='open', severity='critical').count(),
        'failed_logins_7d': LoginAttempt.objects.filter(success=False, created_at__gte=since).count(),
        'locked_accounts': LoginAttempt.objects.filter(failure_reason='account_locked', created_at__gte=since).values('email').distinct().count(),
        'denied_access_7d': AuditEvent.objects.filter(action='access_denied', timestamp__gte=since).count(),
        'exports_7d': AuditEvent.objects.filter(action__icontains='export', timestamp__gte=since).count(),
    })


@api_view(['GET'])
@permission_classes([AdminOnlyPermission])
def permission_matrix_view(request):
    return Response({'permissions': permission_matrix()})
