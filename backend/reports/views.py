import csv
from io import StringIO

from django.db.models import Q
from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from core.audit_service import audit_event
from core.permissions import has_permission
from .models import SavedReport
from .permissions import CanViewReports
from .selectors import REPORT_MAP, run_report
from .serializers import ReportFilterSerializer, SavedReportSerializer


def validated_params(request):
    serializer = ReportFilterSerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    return {
        key: value.isoformat() if hasattr(value, 'isoformat') else value
        for key, value in serializer.validated_data.items()
    }


@api_view(['GET'])
@permission_classes([CanViewReports])
def report_detail(request, report_type):
    if report_type not in REPORT_MAP:
        return Response({'error': 'Unknown report type.'}, status=404)
    return Response(run_report(report_type, validated_params(request)))


def flatten_rows(data):
    rows = []
    for key, value in data.items():
        if key in ('generated_at', 'parameters', 'report_type'):
            continue
        if isinstance(value, dict):
            rows.append({'section': key, **value})
        elif isinstance(value, list):
            for item in value:
                rows.append({'section': key, **(item if isinstance(item, dict) else {'value': item})})
        else:
            rows.append({'section': key, 'value': value})
    return rows or [{'section': 'empty', 'value': ''}]


@api_view(['GET'])
@permission_classes([CanViewReports])
def export_report(request, report_type, export_format):
    if not has_permission(request.user, 'reports.export'):
        audit_event('report_export_denied', 'Report', report_type, request=request, success=False, failure_reason='missing_export_permission', source_module='reports')
        return Response({'detail': 'Export permission required.'}, status=403)
    if report_type not in REPORT_MAP:
        return Response({'error': 'Unknown report type.'}, status=404)
    data = run_report(report_type, validated_params(request))
    rows = flatten_rows(data)
    fields = sorted({key for row in rows for key in row.keys()})

    if export_format == 'csv':
        buffer = StringIO()
        writer = csv.DictWriter(buffer, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
        response = HttpResponse(buffer.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{report_type}-report.csv"'
        audit_event('report_export', 'Report', report_type, request=request, source_module='reports', metadata={'format': export_format, 'parameters': data.get('parameters', {})})
        return response

    if export_format == 'xlsx':
        table = ''.join(
            '<tr>' + ''.join(f'<td>{row.get(field, "")}</td>' for field in fields) + '</tr>'
            for row in rows
        )
        html = (
            '<html><body>'
            f'<h1>{report_type.title()} Report</h1>'
            f'<p>Generated: {data["generated_at"]}</p>'
            f'<p>Parameters: {data["parameters"]}</p>'
            '<table border="1"><thead><tr>'
            + ''.join(f'<th>{field}</th>' for field in fields)
            + '</tr></thead><tbody>'
            + table
            + '</tbody></table></body></html>'
        )
        response = HttpResponse(html, content_type='application/vnd.ms-excel')
        response['Content-Disposition'] = f'attachment; filename="{report_type}-report.xls"'
        audit_event('report_export', 'Report', report_type, request=request, source_module='reports', metadata={'format': export_format, 'parameters': data.get('parameters', {})})
        return response

    if export_format == 'pdf':
        table = ''.join(
            '<tr>' + ''.join(f'<td>{row.get(field, "")}</td>' for field in fields) + '</tr>'
            for row in rows
        )
        html = (
            '<html><body>'
            f'<h1>{report_type.title()} Report</h1>'
            f'<p>Generated: {data["generated_at"]}</p>'
            f'<p>Parameters: {data["parameters"]}</p>'
            '<table border="1" cellspacing="0" cellpadding="4"><thead><tr>'
            + ''.join(f'<th>{field}</th>' for field in fields)
            + '</tr></thead><tbody>'
            + table
            + '</tbody></table></body></html>'
        )
        response = HttpResponse(html, content_type='text/html')
        response['Content-Disposition'] = f'attachment; filename="{report_type}-report.html"'
        audit_event('report_export', 'Report', report_type, request=request, source_module='reports', metadata={'format': export_format, 'parameters': data.get('parameters', {})})
        return response

    return Response({'error': 'Unsupported export format.'}, status=400)


class SavedReportViewSet(viewsets.ModelViewSet):
    serializer_class = SavedReportSerializer
    permission_classes = [CanViewReports]

    def get_queryset(self):
        user = self.request.user
        return SavedReport.objects.filter(Q(owner=user) | Q(is_shared=True)).select_related('owner')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'])
    def run(self, request, pk=None):
        saved = self.get_object()
        return Response(run_report(saved.report_type, saved.filters))
