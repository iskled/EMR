from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from patients.models import Patient
from patients.serializers import PatientListSerializer

from .models import (
    InventoryAlert,
    InventoryBatch,
    InventoryCategory,
    InventoryItem,
    InventoryLocation,
    PurchaseOrder,
    PurchaseOrderItem,
    StockMovement,
    Supplier,
    adjust_stock,
    issue_stock,
    next_inventory_identifier,
    next_inventory_item_sku,
    receive_stock,
    update_inventory_alerts,
)


class InventoryCategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.name', read_only=True)

    class Meta:
        model = InventoryCategory
        fields = '__all__'


class InventoryLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryLocation
        fields = '__all__'


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'


class InventoryItemSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(required=False, allow_blank=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='default_supplier.name', read_only=True)
    location_name = serializers.CharField(source='storage_location.name', read_only=True)
    current_stock = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    stock_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = InventoryItem
        fields = '__all__'

    def create(self, validated_data):
        validated_data['sku'] = next_inventory_item_sku(
            validated_data.get('category'),
            validated_data.get('default_supplier'),
        )
        return super().create(validated_data)


class InventoryBatchSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_sku = serializers.CharField(source='item.sku', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    location_name = serializers.CharField(source='storage_location.name', read_only=True)

    class Meta:
        model = InventoryBatch
        fields = '__all__'
        read_only_fields = ('received_by', 'created_at', 'updated_at')


class StockMovementSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_sku = serializers.CharField(source='item.sku', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_code = serializers.CharField(source='patient.patient_code', read_only=True)
    patient_phone = serializers.CharField(source='patient.phone_primary', read_only=True)
    patient_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = StockMovement
        fields = '__all__'


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_sku = serializers.CharField(source='item.sku', read_only=True)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = '__all__'
        read_only_fields = ('purchase_order',)


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    items = PurchaseOrderItemSerializer(many=True, required=False)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ('created_by', 'submitted_at', 'created_at', 'updated_at')

    def create(self, validated_data):
        items = validated_data.pop('items', [])
        order = PurchaseOrder.objects.create(**validated_data)
        for item in items:
            PurchaseOrderItem.objects.create(purchase_order=order, **item)
        return order

    def update(self, instance, validated_data):
        items = validated_data.pop('items', None)
        instance = super().update(instance, validated_data)
        if items is not None:
            instance.items.all().delete()
            for item in items:
                PurchaseOrderItem.objects.create(purchase_order=instance, **item)
        return instance


class InventoryAlertSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    purchase_order_reference = serializers.CharField(source='purchase_order.reference', read_only=True)

    class Meta:
        model = InventoryAlert
        fields = '__all__'


class StockReceiptSerializer(serializers.Serializer):
    item = serializers.PrimaryKeyRelatedField(queryset=InventoryItem.objects.all())
    batch_number = serializers.CharField(required=False, allow_blank=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    supplier = serializers.PrimaryKeyRelatedField(queryset=Supplier.objects.all(), required=False, allow_null=True)
    storage_location = serializers.PrimaryKeyRelatedField(queryset=InventoryLocation.objects.all(), required=False, allow_null=True)
    manufacture_date = serializers.DateField(required=False, allow_null=True)
    expiry_date = serializers.DateField(required=False, allow_null=True)
    purchase_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    receipt_reference = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def save(self, **kwargs):
        try:
            return receive_stock(
                item=self.validated_data['item'],
                batch_number=self.validated_data.get('batch_number', ''),
                quantity=self.validated_data['quantity'],
                user=self.context['request'].user,
                supplier=self.validated_data.get('supplier'),
                location=self.validated_data.get('storage_location'),
                manufacture_date=self.validated_data.get('manufacture_date'),
                expiry_date=self.validated_data.get('expiry_date'),
                purchase_cost=self.validated_data.get('purchase_cost'),
                receipt_reference=self.validated_data.get('receipt_reference', ''),
                notes=self.validated_data.get('notes', ''),
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)


class StockUsageSerializer(serializers.Serializer):
    item = serializers.PrimaryKeyRelatedField(queryset=InventoryItem.objects.all())
    batch = serializers.PrimaryKeyRelatedField(queryset=InventoryBatch.objects.all(), required=False, allow_null=True)
    storage_location = serializers.PrimaryKeyRelatedField(queryset=InventoryLocation.objects.all(), required=False, allow_null=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), required=False, allow_null=True)
    patient_id = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), source='patient', required=False, allow_null=True, write_only=True)
    appointment_id = serializers.UUIDField(required=False, allow_null=True)
    clinical_note_id = serializers.UUIDField(required=False, allow_null=True)
    orthodontic_visit_id = serializers.IntegerField(required=False, allow_null=True)
    reason = serializers.CharField()

    def save(self, **kwargs):
        try:
            return issue_stock(
                item=self.validated_data['item'],
                batch=self.validated_data.get('batch'),
                location=self.validated_data.get('storage_location'),
                quantity=self.validated_data['quantity'],
                user=self.context['request'].user,
                notes=self.validated_data['reason'],
                patient=self.validated_data.get('patient'),
                appointment_id=self.validated_data.get('appointment_id'),
                clinical_note_id=self.validated_data.get('clinical_note_id'),
                orthodontic_visit_id=self.validated_data.get('orthodontic_visit_id'),
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)


class BulkStockUsageItemSerializer(serializers.Serializer):
    inventory_item = serializers.PrimaryKeyRelatedField(queryset=InventoryItem.objects.all())
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    reason = serializers.CharField(required=False, allow_blank=True)


class BulkStockUsageSerializer(serializers.Serializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    usage_date = serializers.DateField(required=False)
    appointment = serializers.UUIDField(required=False, allow_null=True)
    clinical_note = serializers.UUIDField(required=False, allow_null=True)
    orthodontic_visit = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    items = BulkStockUsageItemSerializer(many=True)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('At least one inventory item is required.')
        merged = {}
        for entry in items:
            item = entry['inventory_item']
            key = item.pk
            if key not in merged:
                merged[key] = {**entry}
            else:
                merged[key]['quantity'] += entry['quantity']
                reasons = [merged[key].get('reason', ''), entry.get('reason', '')]
                merged[key]['reason'] = '; '.join(reason for reason in reasons if reason)
        return list(merged.values())

    def save(self, **kwargs):
        patient = self.validated_data['patient']
        notes = self.validated_data.get('notes', '')
        correlation_id = kwargs.get('correlation_id', '')
        created_movements = []
        try:
            with transaction.atomic():
                for entry in self.validated_data['items']:
                    reason = entry.get('reason') or notes or 'Inventory usage'
                    issue_stock(
                        item=entry['inventory_item'],
                        quantity=entry['quantity'],
                        user=self.context['request'].user,
                        notes=reason,
                        patient=patient,
                        appointment_id=self.validated_data.get('appointment'),
                        clinical_note_id=self.validated_data.get('clinical_note'),
                        orthodontic_visit_id=self.validated_data.get('orthodontic_visit'),
                        source_model='InventoryUsageBatch',
                        source_id=correlation_id,
                    )
                created_movements = list(
                    StockMovement.objects
                    .select_related('item', 'batch', 'location', 'user', 'patient')
                    .filter(source_model='InventoryUsageBatch', source_id=correlation_id)
                    .order_by('created_at', 'pk')
                )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return {
            'patient': patient,
            'movements': created_movements,
            'usage_count': len(created_movements),
            'correlation_id': correlation_id,
        }


class StockAdjustmentSerializer(serializers.Serializer):
    batch = serializers.PrimaryKeyRelatedField(queryset=InventoryBatch.objects.all())
    quantity_delta = serializers.DecimalField(max_digits=12, decimal_places=2)
    adjustment_type = serializers.ChoiceField(choices=[
        ('adjustment', 'Count Correction'),
        ('return_supplier', 'Return To Supplier'),
        ('transfer_out', 'Transfer Out'),
        ('transfer_in', 'Transfer In'),
    ], default='adjustment')
    reason = serializers.CharField()
    location = serializers.PrimaryKeyRelatedField(queryset=InventoryLocation.objects.all(), required=False, allow_null=True)

    def save(self, **kwargs):
        try:
            return adjust_stock(
                batch=self.validated_data['batch'],
                quantity_delta=self.validated_data['quantity_delta'],
                movement_type=self.validated_data['adjustment_type'],
                user=self.context['request'].user,
                notes=self.validated_data['reason'],
                location=self.validated_data.get('location'),
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)


class StockTransferSerializer(serializers.Serializer):
    batch = serializers.PrimaryKeyRelatedField(queryset=InventoryBatch.objects.all())
    to_location = serializers.PrimaryKeyRelatedField(queryset=InventoryLocation.objects.all())
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    reason = serializers.CharField()

    def save(self, **kwargs):
        batch = self.validated_data['batch']
        quantity = self.validated_data['quantity']
        to_location = self.validated_data['to_location']
        reason = self.validated_data['reason']
        try:
            adjust_stock(
                batch=batch,
                quantity_delta=-quantity,
                movement_type='transfer_out',
                user=self.context['request'].user,
                notes=reason,
            )
            return receive_stock(
                item=batch.item,
                batch_number=f'{batch.batch_number}-T{to_location_id_suffix(to_location.pk)}',
                quantity=quantity,
                user=self.context['request'].user,
                supplier=batch.supplier,
                location=to_location,
                purchase_cost=batch.purchase_cost,
                manufacture_date=batch.manufacture_date,
                expiry_date=batch.expiry_date,
                receipt_reference=f'Transfer from {batch.storage_location}',
                notes=reason,
                source_model='InventoryBatch',
                source_id=str(batch.pk),
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)


def to_location_id_suffix(value):
    return str(value)[-6:]
