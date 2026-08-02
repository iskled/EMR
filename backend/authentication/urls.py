from django.urls import path
from django.urls import include
from rest_framework.routers import DefaultRouter
from .views import (
    AdminUserViewSet,
    RegisterView,
    CustomLoginView,
    CustomRefreshView,
    LogoutView,
    PasswordChangeView,
    ProfileView,
    DentistListView
)

router = DefaultRouter()
router.register(r'users', AdminUserViewSet, basename='auth-user')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('refresh/', CustomRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('password/change/', PasswordChangeView.as_view(), name='password_change'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('dentists/', DentistListView.as_view(), name='dentists'),
]
