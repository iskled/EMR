from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'appointment-types', views.AppointmentTypeViewSet, basename='appointment-type')
router.register(r'appointments', views.AppointmentViewSet, basename='appointment')
router.register(r'waiting-list', views.WaitingListViewSet, basename='waiting-list')

urlpatterns = [
    path('', include(router.urls)),
]
