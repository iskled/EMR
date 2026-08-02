from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .dashboard import dashboard_payload
from .permissions import HasPermission


class DashboardView(APIView):
    permission_classes = [IsAuthenticated, HasPermission]
    permission_required = 'dashboard.view'

    def get(self, request):
        return Response(dashboard_payload(request.user))
