from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')

        email = self.normalize_email(email)

        user = self.model(email=email, **extra_fields)

        user.set_password(password)

        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'admin')

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None

    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('dentist', 'Dentist'),
        ('assistant', 'Assistant'),
        ('receptionist', 'Receptionist'),
        ('nurse', 'Nurse'),
        ('backoffice', 'Backoffice Staff'),
    ]

    email = models.EmailField(unique=True)

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='assistant'
    )

    phone = models.CharField(max_length=20, blank=True, null=True)

    specialization = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    license_number = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )
    can_manage_dentists = models.BooleanField(default=False)
    deactivated_at = models.DateTimeField(null=True, blank=True)
    deactivated_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='deactivated_dentist_accounts')
    deactivation_reason = models.TextField(blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='archived_dentist_accounts')
    archive_reason = models.TextField(blank=True)

    failed_login_count = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_password_change = models.DateTimeField(null=True, blank=True)
    must_change_password = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'

    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def is_locked(self):
        return bool(self.locked_until and self.locked_until > timezone.now())


class PasswordHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_history')
    password_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'password_history'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f'{self.user.email} password history'
