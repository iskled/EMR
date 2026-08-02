from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.audit_service import audit_event, model_snapshot, security_alert
from core.models import AuditEvent, LoginAttempt
from core.permissions import AdminOnlyPermission, has_permission, permission_matrix
from .models import PasswordHistory, User
from .serializers import (
    AdminPasswordResetSerializer,
    AdminUserCreateSerializer,
    AdminUserUpdateSerializer,
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    PasswordChangeSerializer,
    UserSerializer
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def check_permissions(self, request):
        super().check_permissions(request)
        if not has_permission(request.user, 'users.manage'):
            self.permission_denied(request, message='Not permitted.')

    def perform_create(self, serializer):
        user = serializer.save()
        audit_event('user_create', 'User', user.pk, request=self.request, user=self.request.user, new_values=UserSerializer(user).data, source_module='authentication')


class CustomLoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class CustomRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        audit_event('token_refresh', 'authentication', request=request, success=response.status_code < 400, failure_reason='' if response.status_code < 400 else 'refresh_failed', source_module='authentication')
        if response.status_code >= 400:
            security_alert('failed_token_refresh', 'Failed token refresh attempt.', severity='medium', source_module='authentication')
        return response


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh = request.data.get('refresh')
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except Exception:
                audit_event('logout', 'authentication', request=request, success=False, failure_reason='refresh_blacklist_failed', source_module='authentication')
                return Response({'detail': 'Logout completed.'}, status=status.HTTP_200_OK)
        audit_event('logout', 'authentication', request=request, source_module='authentication')
        return Response({'detail': 'Logout completed.'})


class PasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Password changed.'})


class ProfileView(generics.RetrieveAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class DentistListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(
            role='dentist',
            is_active=True
        )


class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [AdminOnlyPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active', 'must_change_password']
    search_fields = ['email', 'first_name', 'last_name', 'phone', 'specialization', 'license_number']
    ordering_fields = ['email', 'first_name', 'last_name', 'role', 'last_login', 'last_password_change', 'failed_login_count']
    ordering = ['first_name', 'last_name', 'email']

    def get_queryset(self):
        qs = User.objects.all()
        locked = self.request.query_params.get('locked')
        if locked == 'true':
            qs = qs.filter(locked_until__gt=timezone.now())
        elif locked == 'false':
            qs = qs.filter(Q(locked_until__isnull=True) | Q(locked_until__lte=timezone.now()))
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminUserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return AdminUserUpdateSerializer
        return UserSerializer

    def _active_admin_count(self, exclude_user=None):
        qs = User.objects.filter(role='admin', is_active=True)
        if exclude_user:
            qs = qs.exclude(pk=exclude_user.pk)
        return qs.count()

    def _is_self(self, request, target):
        return str(getattr(request.user, 'pk', '')) == str(target.pk)

    def _assert_not_last_admin(self, target, role=None, is_active=None):
        final_role = role if role is not None else target.role
        final_active = is_active if is_active is not None else target.is_active
        if target.role == 'admin' and (final_role != 'admin' or not final_active):
            if self._active_admin_count(exclude_user=target) == 0:
                raise PermissionError('Cannot remove the last active admin.')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        audit_event('user_create', 'User', user.pk, request=request, user=request.user, new_values=UserSerializer(user).data, source_module='authentication')
        return Response(UserSerializer(user).data, status=201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        user = self.get_object()
        previous = model_snapshot(user)
        previous_role = user.role
        previous_is_active = user.is_active
        serializer = self.get_serializer(user, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        role = serializer.validated_data.get('role', user.role)
        is_active = serializer.validated_data.get('is_active', user.is_active)
        try:
            self._assert_not_last_admin(user, role=role, is_active=is_active)
        except PermissionError as exc:
            return Response({'detail': str(exc)}, status=400)
        if self._is_self(request, user) and (role != 'admin' or not is_active):
            return Response({'detail': 'Self-demotion and self-deactivation must be performed by another active admin.'}, status=400)
        serializer.save()
        user.refresh_from_db()
        action = 'user_update'
        if previous_role != user.role:
            action = 'user_role_change'
            security_alert('user_role_change', f'Role changed for {user.email}', user=user, severity='high', source_module='authentication')
        if previous_is_active != user.is_active:
            action = 'user_activation_change'
            security_alert('user_activation_change', f'Activation status changed for {user.email}', user=user, severity='high', source_module='authentication')
        audit_event(action, 'User', user.pk, request=request, user=request.user, previous_values=previous, new_values=UserSerializer(user).data, source_module='authentication')
        return Response(UserSerializer(user).data)

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'User deletion is disabled. Deactivate the account instead.'}, status=405)

    @action(detail=False, methods=['get'])
    def metrics(self, request):
        now = timezone.now()
        return Response({
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'inactive_users': User.objects.filter(is_active=False).count(),
            'locked_users': User.objects.filter(locked_until__gt=now).count(),
            'force_password_change': User.objects.filter(must_change_password=True).count(),
            'by_role': list(User.objects.values('role').annotate(count=Count('id')).order_by('role')),
        })

    @action(detail=False, methods=['get'], url_path='permission-matrix')
    def permission_matrix(self, request):
        return Response({'permissions': permission_matrix()})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        user = self.get_object()
        previous = model_snapshot(user)
        user.is_active = True
        user.save(update_fields=['is_active'])
        audit_event('user_activate', 'User', user.pk, request=request, user=request.user, previous_values=previous, new_values=UserSerializer(user).data, source_module='authentication')
        security_alert('user_activated', f'User activated: {user.email}', user=user, severity='medium', source_module='authentication')
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        try:
            self._assert_not_last_admin(user, is_active=False)
        except PermissionError as exc:
            return Response({'detail': str(exc)}, status=400)
        if self._is_self(request, user):
            return Response({'detail': 'Self-deactivation must be performed by another active admin.'}, status=400)
        previous = model_snapshot(user)
        user.is_active = False
        user.save(update_fields=['is_active'])
        audit_event('user_deactivate', 'User', user.pk, request=request, user=request.user, previous_values=previous, new_values=UserSerializer(user).data, source_module='authentication')
        security_alert('user_deactivated', f'User deactivated: {user.email}', user=user, severity='high', source_module='authentication')
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['post'])
    def unlock(self, request, pk=None):
        user = self.get_object()
        previous = model_snapshot(user)
        user.locked_until = None
        user.failed_login_count = 0
        user.save(update_fields=['locked_until', 'failed_login_count'])
        audit_event('user_unlock', 'User', user.pk, request=request, user=request.user, previous_values=previous, new_values=UserSerializer(user).data, source_module='authentication')
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['post'], url_path='reset-failed-logins')
    def reset_failed_logins(self, request, pk=None):
        user = self.get_object()
        previous = model_snapshot(user)
        user.failed_login_count = 0
        user.save(update_fields=['failed_login_count'])
        audit_event('user_reset_failed_logins', 'User', user.pk, request=request, user=request.user, previous_values=previous, new_values=UserSerializer(user).data, source_module='authentication')
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['post'], url_path='force-password-change')
    def force_password_change(self, request, pk=None):
        user = self.get_object()
        previous = model_snapshot(user)
        user.must_change_password = True
        user.save(update_fields=['must_change_password'])
        audit_event('user_force_password_change', 'User', user.pk, request=request, user=request.user, previous_values=previous, new_values=UserSerializer(user).data, source_module='authentication')
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        user = self.get_object()
        serializer = AdminPasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        previous = {'last_password_change': user.last_password_change, 'must_change_password': user.must_change_password}
        user.set_password(serializer.validated_data['temporary_password'])
        user.last_password_change = timezone.now()
        user.must_change_password = serializer.validated_data.get('force_password_change', True)
        user.save(update_fields=['password', 'last_password_change', 'must_change_password'])
        PasswordHistory.objects.create(user=user, password_hash=user.password)
        audit_event('user_password_reset', 'User', user.pk, request=request, user=request.user, previous_values=previous, new_values={'last_password_change': user.last_password_change, 'must_change_password': user.must_change_password}, source_module='authentication')
        security_alert('user_password_reset', f'Temporary password issued for {user.email}', user=user, severity='high', source_module='authentication')
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['post'], url_path='revoke-sessions')
    def revoke_sessions(self, request, pk=None):
        user = self.get_object()
        count = 0
        for token in OutstandingToken.objects.filter(user=user):
            _, created = BlacklistedToken.objects.get_or_create(token=token)
            if created:
                count += 1
        audit_event('user_revoke_sessions', 'User', user.pk, request=request, user=request.user, source_module='authentication', metadata={'revoked_tokens': count})
        return Response({'revoked_tokens': count})

    @action(detail=True, methods=['get'], url_path='security-history')
    def security_history(self, request, pk=None):
        user = self.get_object()
        attempts = LoginAttempt.objects.filter(user=user)[:50]
        alerts = user.security_alerts.all()[:50]
        return Response({
            'login_attempts': [
                {
                    'id': item.id,
                    'success': item.success,
                    'failure_reason': item.failure_reason,
                    'ip_address': item.ip_address,
                    'created_at': item.created_at,
                }
                for item in attempts
            ],
            'alerts': [
                {
                    'id': item.id,
                    'alert_type': item.alert_type,
                    'severity': item.severity,
                    'status': item.status,
                    'message': item.message,
                    'created_at': item.created_at,
                }
                for item in alerts
            ],
        })

    @action(detail=True, methods=['get'], url_path='audit-history')
    def audit_history(self, request, pk=None):
        user = self.get_object()
        events = AuditEvent.objects.filter(Q(user=user) | Q(resource_type='User', resource_id=str(user.pk)))[:100]
        return Response([
            {
                'id': item.id,
                'timestamp': item.timestamp,
                'action': item.action,
                'resource_type': item.resource_type,
                'resource_id': item.resource_id,
                'success': item.success,
                'failure_reason': item.failure_reason,
                'source_module': item.source_module,
            }
            for item in events
        ])
