from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'tooth-charts', views.ToothChartViewSet, basename='tooth-chart')
router.register(r'treatment-plans', views.TreatmentPlanViewSet, basename='treatment-plan')
router.register(r'clinical-notes', views.ClinicalNoteViewSet, basename='clinical-note')
router.register(r'clinical-images', views.ClinicalImageViewSet, basename='clinical-image')
router.register(r'recalls', views.RecallScheduleViewSet, basename='recall')
router.register(r'clinical-templates', views.ClinicalTemplateViewSet, basename='clinical-template')

# NEW
router.register(r'orthodontic-cases', views.OrthodonticCaseViewSet, basename='orthodontic-case')
router.register(r'orthodontic-visits', views.OrthodonticVisitViewSet, basename='orthodontic-visit')

urlpatterns = [
    path('', include(router.urls)),
]