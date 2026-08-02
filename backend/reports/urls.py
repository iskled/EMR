from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'saved-reports', views.SavedReportViewSet, basename='saved-report')

urlpatterns = [
    path('reports/<str:report_type>/', views.report_detail, name='report-detail'),
    path('reports/<str:report_type>/export/<str:export_format>/', views.export_report, name='report-export'),
    path('', include(router.urls)),
]
