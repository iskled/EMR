from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'tooth-charts', views.ToothChartViewSet, basename='tooth-chart')
router.register(r'treatment-plans', views.TreatmentPlanViewSet, basename='treatment-plan')
router.register(r'clinical-notes', views.ClinicalNoteViewSet, basename='clinical-note')
router.register(r'clinical-images', views.ClinicalImageViewSet, basename='clinical-image')

urlpatterns = [
    path('', include(router.urls)),
]
