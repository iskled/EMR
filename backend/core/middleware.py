import uuid

from .audit_service import audit_event, security_alert


class RequestCorrelationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.correlation_id = request.headers.get('X-Request-ID') or str(uuid.uuid4())
        response = self.get_response(request)
        response['X-Request-ID'] = request.correlation_id
        if response.status_code in (401, 403):
            reason = 'unauthorized' if response.status_code == 401 else 'forbidden'
            audit_event(
                action='access_denied',
                resource_type='permission',
                request=request,
                success=False,
                failure_reason=reason,
                source_module='security',
                metadata={'status_code': response.status_code},
            )
            security_alert(
                'denied_access',
                f'Permission-sensitive access attempt: {request.path}',
                user=request.user if getattr(request, 'user', None) and request.user.is_authenticated else None,
                severity='medium',
                metadata={'path': request.path, 'method': request.method, 'status_code': response.status_code},
            )
        return response
