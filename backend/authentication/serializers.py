from rest_framework import serializers
from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from core.audit_service import audit_event, request_ip, security_alert
from core.models import LoginAttempt
from .models import PasswordHistory, User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    is_locked = serializers.BooleanField(read_only=True)
    effective_permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'first_name',
            'last_name',
            'role',
            'phone',
            'specialization',
            'license_number',
            'is_active',
            'is_locked',
            'last_login',
            'last_password_change',
            'failed_login_count',
            'must_change_password',
            'locked_until',
            'effective_permissions',
        ]
        read_only_fields = ['last_login', 'last_password_change', 'locked_until']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.email

    def get_effective_permissions(self, obj):
        from core.permissions import PERMISSIONS
        return sorted(permission for permission, roles in PERMISSIONS.items() if obj.role in roles)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=10)

    class Meta:
        model = User
        fields = [
            'email',
            'password',
            'first_name',
            'last_name',
            'role',
            'phone',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        validate_password(password)

        user = User(**validated_data)
        user.set_password(password)
        user.last_password_change = timezone.now()
        user.save()
        PasswordHistory.objects.create(user=user, password_hash=user.password)

        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token['email'] = user.email
        token['role'] = user.role

        return token

    def validate(self, attrs):
        email = attrs.get(self.username_field, '')
        request = self.context.get('request')
        user = User.objects.filter(email__iexact=email).first()
        if user and user.is_locked:
            LoginAttempt.objects.create(
                email=email,
                user=user,
                success=False,
                failure_reason='account_locked',
                ip_address=request_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
                correlation_id=getattr(request, 'correlation_id', ''),
            )
            audit_event('login_failure', 'authentication', request=request, user=user, success=False, failure_reason='account_locked', source_module='authentication')
            security_alert('locked_account', f'Locked account login attempt for {email}', user=user, severity='high', source_module='authentication')
            raise AuthenticationFailed('Unable to log in with provided credentials.')

        try:
            data = super().validate(attrs)
        except Exception:
            if user:
                user.failed_login_count += 1
                max_attempts = getattr(settings, 'SECURITY_LOGIN_MAX_FAILED_ATTEMPTS', 5)
                if user.failed_login_count >= max_attempts:
                    user.locked_until = timezone.now() + timezone.timedelta(minutes=getattr(settings, 'SECURITY_ACCOUNT_LOCKOUT_MINUTES', 15))
                    security_alert('account_locked', f'Account locked after repeated failed login attempts for {email}', user=user, severity='high', source_module='authentication')
                user.save(update_fields=['failed_login_count', 'locked_until'])
            LoginAttempt.objects.create(
                email=email,
                user=user,
                success=False,
                failure_reason='invalid_credentials',
                ip_address=request_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
                correlation_id=getattr(request, 'correlation_id', ''),
            )
            audit_event('login_failure', 'authentication', request=request, user=user, success=False, failure_reason='invalid_credentials', source_module='authentication')
            raise AuthenticationFailed('Unable to log in with provided credentials.')

        self.user.failed_login_count = 0
        self.user.locked_until = None
        self.user.save(update_fields=['failed_login_count', 'locked_until', 'last_login'])
        LoginAttempt.objects.create(
            email=self.user.email,
            user=self.user,
            success=True,
            ip_address=request_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
            correlation_id=getattr(request, 'correlation_id', ''),
        )
        audit_event('login_success', 'authentication', request=request, user=self.user, source_module='authentication')
        data['user'] = UserSerializer(self.user).data
        return data


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=10)

    def validate_new_password(self, value):
        validate_password(value, self.context['request'].user)
        history_count = getattr(settings, 'SECURITY_PASSWORD_HISTORY_COUNT', 5)
        for item in self.context['request'].user.password_history.all()[:history_count]:
            if check_password(value, item.password_hash):
                raise serializers.ValidationError('Choose a password that has not been used recently.')
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        if not user.check_password(attrs['current_password']):
            raise serializers.ValidationError({'current_password': 'Current password is incorrect.'})
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.last_password_change = timezone.now()
        user.must_change_password = False
        user.save(update_fields=['password', 'last_password_change', 'must_change_password'])
        PasswordHistory.objects.create(user=user, password_hash=user.password)
        audit_event('password_change', 'User', user.pk, request=self.context['request'], user=user, source_module='authentication')
        return user


class AdminUserCreateSerializer(serializers.ModelSerializer):
    temporary_password = serializers.CharField(write_only=True, min_length=10)
    force_password_change = serializers.BooleanField(write_only=True, default=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role', 'phone',
            'specialization', 'license_number', 'temporary_password',
            'force_password_change', 'is_active',
        ]
        read_only_fields = ['id']

    def validate_temporary_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('temporary_password')
        force_password_change = validated_data.pop('force_password_change', True)
        user = User(**validated_data)
        user.set_password(password)
        user.must_change_password = force_password_change
        user.last_password_change = timezone.now()
        user.save()
        PasswordHistory.objects.create(user=user, password_hash=user.password)
        return user


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    force_password_change = serializers.BooleanField(source='must_change_password', required=False)

    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'role', 'phone', 'specialization',
            'license_number', 'is_active', 'force_password_change',
        ]


class AdminPasswordResetSerializer(serializers.Serializer):
    temporary_password = serializers.CharField(write_only=True, min_length=10)
    force_password_change = serializers.BooleanField(default=True)

    def validate_temporary_password(self, value):
        validate_password(value)
        return value
