from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):

    model = User

    list_display = (
        'email',
        'first_name',
        'last_name',
        'role',
        'is_staff',
        'is_active',
    )

    list_filter = (
        'role',
        'is_staff',
        'is_active',
    )

    ordering = ('email',)

    search_fields = (
        'email',
        'first_name',
        'last_name',
        'license_number',
    )

    fieldsets = (
        (None, {
            'fields': (
                'email',
                'password',
            )
        }),

        ('Personal Info', {
            'fields': (
                'first_name',
                'last_name',
                'phone',
            )
        }),

        ('Professional Info', {
            'fields': (
                'role',
                'specialization',
                'license_number',
            )
        }),

        ('Permissions', {
            'fields': (
                'is_active',
                'is_staff',
                'is_superuser',
                'groups',
                'user_permissions',
            )
        }),

        ('Important Dates', {
            'fields': (
                'last_login',
                'date_joined',
            )
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),

            'fields': (
                'email',
                'first_name',
                'last_name',
                'phone',

                'role',
                'specialization',
                'license_number',

                'password1',
                'password2',

                'is_staff',
                'is_active',
            ),
        }),
    )