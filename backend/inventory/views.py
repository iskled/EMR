from datetime import date, timedelta
from uuid import uuid4

from django.db import transaction
from django.db.models import Sum, F
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import ValidationError
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.audit_service import audit_event
from core.audit import AuditLogMixin
from .models import (
    InventoryAlert,
    InventoryBatch,
    InventoryCategory,
    InventoryItem,
    InventoryLocation,
    PurchaseOrder,
    Supplier,
    StockMovement,
    receive_stock,
    update_inventory_alerts,
)
from .permissions import CanDestructivelyAdjustInventory, CanManageInventory
from .serializers import (
    InventoryAlertSerializer,
    InventoryBatchSerializer,
    InventoryCategorySerializer,
    InventoryItemSerializer,
    InventoryLocationSerializer,
    PurchaseOrderSerializer,
    StockAdjustmentSerializer,
    StockMovementSerializer,
    StockReceiptSerializer,
    StockTransferSerializer,
    StockUsageSerializer,
    BulkStockUsageSerializer,
    SupplierSerializer,
)


class InventoryCategoryViewSet(AuditLogMixin, viewsets.ModelViewSet):
    permission_classes = [CanManageInventory]
    queryset = InventoryCategory.objects.select_related('parent')
    serializer_class = InventoryCategorySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'parent']
    search_fields = ['name', 'code', 'description']
    ordering = ['name']


class InventoryLocationViewSet(AuditLogMixin, viewsets.ModelViewSet):
    permission_classes = [CanManageInventory]
    queryset = InventoryLocation.objects.all()
    serializer_class = InventoryLocationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'code', 'description']


class SupplierViewSet(AuditLogMixin, viewsets.ModelViewSet):
    permission_classes = [CanManageInventory]
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'contact_person', 'phone', 'email']


class InventoryItemViewSet(AuditLogMixin, viewsets.ModelViewSet):
    permission_classes = [CanManageInventory]
    serializer_class = InventoryItemSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'item_type', 'default_supplier', 'storage_location', 'is_active']
    search_fields = ['name', 'sku', 'description']
    ordering_fields = ['name', 'sku', 'unit_cost']
    ordering = ['name']

    def get_queryset(self):
        return InventoryItem.objects.select_related(
            'category', 'default_supplier', 'storage_location'
        ).prefetch_related('batches')

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        expiry_days = int(request.query_params.get('expiry_days', 30))
        for item in self.get_queryset():
            update_inventory_alerts(item, expiry_days=expiry_days)

        today = date.today()
        items = list(self.get_queryset())
        total_stock_value = sum(item.stock_value for item in items)
        low_stock = [item for item in items if item.current_stock > 0 and item.current_stock <= item.reorder_level]
        out_stock = [item for item in items if item.current_stock <= 0]
        expiring = InventoryBatch.objects.filter(
            expiry_date__gte=today,
            expiry_date__lte=today + timedelta(days=expiry_days),
            quantity_remaining__gt=0,
        )
        expired = InventoryBatch.objects.filter(expiry_date__lt=today, quantity_remaining__gt=0)
        pending_po = PurchaseOrder.objects.filter(status__in=['draft', 'submitted', 'partially_received'])
        recent = StockMovement.objects.select_related('item', 'batch', 'location', 'user')[:10]

        return Response({
            'total_items': len(items),
            'total_stock_value': total_stock_value,
            'low_stock_items': len(low_stock),
            'out_of_stock_items': len(out_stock),
            'expiring_soon': expiring.count(),
            'expired_items': expired.count(),
            'pending_purchase_orders': pending_po.count(),
            'recent_movements': StockMovementSerializer(recent, many=True).data,
        })

    @action(detail=False, methods=['post'])
    def receipt(self, request):
        serializer = StockReceiptSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        batch = serializer.save()
        audit_event('inventory_receipt', 'InventoryBatch', batch.pk, request=request, source_module='inventory', metadata={'item': batch.item_id, 'quantity': str(batch.quantity_received)})
        return Response(InventoryBatchSerializer(batch).data, status=201)

    @action(detail=False, methods=['post'])
    def usage(self, request):
        self.inventory_action = 'usage'
        serializer = StockUsageSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        try:
            batches = serializer.save()
        except ValidationError as exc:
            audit_event('inventory_usage_failed', 'InventoryItem', request.data.get('item', ''), request=request, patient_id=request.data.get('patient') or request.data.get('patient_id') or '', success=False, failure_reason=str(exc.detail)[:255], source_module='inventory')
            raise
        audit_event('inventory_usage', 'InventoryBatch', ','.join(str(batch.pk) for batch in batches), request=request, patient_id=request.data.get('patient') or request.data.get('patient_id') or '', source_module='inventory', metadata={'batch_count': len(batches)})
        return Response(InventoryBatchSerializer(batches, many=True).data)

    @action(detail=False, methods=['post'], url_path='usage/bulk')
    def bulk_usage(self, request):
        serializer = BulkStockUsageSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        correlation = str(uuid4())
        try:
            result = serializer.save(correlation_id=correlation)
        except ValidationError as exc:
            audit_event('inventory_bulk_usage_failed', 'InventoryUsageBatch', correlation, request=request, patient_id=request.data.get('patient', ''), success=False, failure_reason=str(exc.detail)[:255], source_module='inventory', metadata={'items': request.data.get('items', [])})
            raise
        patient = result['patient']
        movements = result['movements']
        audit_event(
            'inventory_bulk_usage',
            'InventoryUsageBatch',
            correlation,
            request=request,
            patient_id=patient.pk,
            source_module='inventory',
            metadata={
                'usage_count': result['usage_count'],
                'items': [
                    {'item': movement.item_id, 'quantity': str(abs(movement.quantity))}
                    for movement in movements
                ],
            },
        )
        return Response({
            'patient': {
                'id': str(patient.pk),
                'full_name': patient.full_name,
                'patient_code': patient.patient_code,
                'phone_primary': patient.phone_primary,
            },
            'usage_count': result['usage_count'],
            'correlation_id': correlation,
            'movements': StockMovementSerializer(movements, many=True).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[CanDestructivelyAdjustInventory])
    def adjustment(self, request):
        serializer = StockAdjustmentSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        batch = serializer.save()
        audit_event('inventory_adjustment', 'InventoryBatch', batch.pk, request=request, source_module='inventory', metadata={'item': batch.item_id, 'quantity_remaining': str(batch.quantity_remaining)})
        return Response(InventoryBatchSerializer(batch).data)

    @action(detail=False, methods=['post'])
    def transfer(self, request):
        serializer = StockTransferSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        batch = serializer.save()
        audit_event('inventory_transfer', 'InventoryBatch', batch.pk, request=request, source_module='inventory', metadata={'item': batch.item_id, 'location': batch.storage_location_id})
        return Response(InventoryBatchSerializer(batch).data, status=201)


class InventoryBatchViewSet(AuditLogMixin, viewsets.ModelViewSet):
    permission_classes = [CanManageInventory]
    serializer_class = InventoryBatchSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['item', 'supplier', 'storage_location', 'status']
    search_fields = ['batch_number', 'receipt_reference', 'item__name', 'item__sku']
    ordering_fields = ['expiry_date', 'created_at', 'quantity_remaining']
    ordering = ['expiry_date']

    def get_queryset(self):
        return InventoryBatch.objects.select_related('item', 'supplier', 'storage_location', 'received_by')


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [CanManageInventory]
    serializer_class = StockMovementSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['item', 'batch', 'location', 'movement_type', 'patient']
    search_fields = ['notes', 'item__name', 'item__sku', 'batch__batch_number', 'patient__first_name', 'patient__last_name', 'patient__patient_code']
    ordering = ['-created_at']

    def get_queryset(self):
        return StockMovement.objects.select_related('item', 'batch', 'location', 'user', 'patient')


class PurchaseOrderViewSet(AuditLogMixin, viewsets.ModelViewSet):
    permission_classes = [CanManageInventory]
    serializer_class = PurchaseOrderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['supplier', 'status']
    search_fields = ['reference', 'notes', 'supplier__name']
    ordering = ['-created_at']

    def get_queryset(self):
        return PurchaseOrder.objects.select_related('supplier', 'created_by').prefetch_related('items__item')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        order = self.get_object()
        order.status = 'submitted'
        order.submitted_at = timezone.now()
        order.save(update_fields=['status', 'submitted_at', 'updated_at'])
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def receive(self, request, pk=None):
        order = self.get_object()
        location_id = request.data.get('storage_location')
        receipt_reference = request.data.get('receipt_reference') or order.reference or f'PO-{order.pk}'
        received = []
        for line in order.items.select_for_update().select_related('item'):
            remaining = line.quantity_ordered - line.quantity_received
            if remaining <= 0:
                continue
            batch_number = request.data.get('batch_number') or ''
            batch = receive_stock(
                item=line.item,
                batch_number=batch_number,
                quantity=remaining,
                user=request.user,
                supplier=order.supplier,
                location=line.item.storage_location_id and line.item.storage_location,
                purchase_cost=line.unit_cost,
                receipt_reference=receipt_reference,
                notes=f'Received from purchase order {order.pk}',
                source_model='PurchaseOrder',
                source_id=str(order.pk),
            )
            line.quantity_received += remaining
            line.save(update_fields=['quantity_received'])
            received.append(batch)
        order.refresh_status()
        order.save(update_fields=['status', 'updated_at'])
        return Response({
            'purchase_order': self.get_serializer(order).data,
            'batches': InventoryBatchSerializer(received, many=True).data,
        })


class InventoryAlertViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageInventory]
    serializer_class = InventoryAlertSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'alert_type', 'item', 'batch']
    search_fields = ['message', 'item__name', 'item__sku']
    ordering = ['status', '-created_at']

    def get_queryset(self):
        return InventoryAlert.objects.select_related('item', 'batch', 'purchase_order', 'acknowledged_by')

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'acknowledged'
        alert.acknowledged_by = request.user
        alert.acknowledged_at = timezone.now()
        alert.save(update_fields=['status', 'acknowledged_by', 'acknowledged_at', 'updated_at'])
        return Response(self.get_serializer(alert).data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'resolved'
        alert.resolved_at = timezone.now()
        alert.save(update_fields=['status', 'resolved_at', 'updated_at'])
        return Response(self.get_serializer(alert).data)
