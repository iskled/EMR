from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ChecklistTemplateViewSet,
    TaskAlertViewSet,
    TaskAttachmentViewSet,
    TaskChecklistItemViewSet,
    TaskCommentViewSet,
    TaskDependencyViewSet,
    TaskViewSet,
)

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'task-checklist-templates', ChecklistTemplateViewSet, basename='task-checklist-template')
router.register(r'task-checklist-items', TaskChecklistItemViewSet, basename='task-checklist-item')
router.register(r'task-comments', TaskCommentViewSet, basename='task-comment')
router.register(r'task-attachments', TaskAttachmentViewSet, basename='task-attachment')
router.register(r'task-dependencies', TaskDependencyViewSet, basename='task-dependency')
router.register(r'task-alerts', TaskAlertViewSet, basename='task-alert')

urlpatterns = [
    path('', include(router.urls)),
]
