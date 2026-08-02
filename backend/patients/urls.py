from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'patients', views.PatientViewSet, basename='patient')
router.register(r'patient-documents', views.PatientDocumentViewSet, basename='patient-document')
router.register(r'patient-communications', views.PatientCommunicationViewSet, basename='patient-communication')
router.register(r'patient-medical-history', views.MedicalHistoryViewSet, basename='patient-medical-history')
router.register(r'patient-allergies', views.AllergyViewSet, basename='patient-allergy')

urlpatterns = [
    path('', include(router.urls)),
]
