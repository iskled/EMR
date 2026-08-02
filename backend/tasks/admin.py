from django.contrib import admin

from .models import (
    ChecklistTemplate,
    ChecklistTemplateItem,
    Task,
    TaskAlert,
    TaskAssignmentHistory,
    TaskAttachment,
    TaskChecklistItem,
    TaskComment,
    TaskDependency,
)


class ChecklistTemplateItemInline(admin.TabularInline):
    model = ChecklistTemplateItem
    extra = 1


@admin.register(ChecklistTemplate)
class ChecklistTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'task_type', 'is_active', 'created_at']
    list_filter = ['task_type', 'is_active']
    search_fields = ['name', 'description']
    inlines = [ChecklistTemplateItemInline]


class TaskChecklistItemInline(admin.TabularInline):
    model = TaskChecklistItem
    extra = 0


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'task_type', 'priority', 'status', 'assigned_user', 'assigned_role', 'due_date']
    list_filter = ['task_type', 'priority', 'status', 'assigned_role']
    search_fields = ['title', 'description', 'patient__first_name', 'patient__last_name']
    date_hierarchy = 'due_date'
    inlines = [TaskChecklistItemInline]


admin.site.register(TaskAssignmentHistory)
admin.site.register(TaskComment)
admin.site.register(TaskAttachment)
admin.site.register(TaskDependency)
admin.site.register(TaskAlert)
