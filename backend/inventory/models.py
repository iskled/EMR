from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Sum
from django.utils import timezone


class InventoryCategory(models.Model):
    name = models.CharField(max_length=120, unique=True)
    code = models.SlugField(max_length=80, unique=True)
    parent = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='children'
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class InventoryLocation(models.Model):
    name = models.CharField(max_length=120, unique=True)
    code = models.SlugField(max_length=80, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Supplier(models.Model):
    name = models.CharField(max_length=180, unique=True)
    contact_person = models.CharField(max_length=160, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    payment_terms = models.CharField(max_length=120, blank=True)
    lead_time_days = models.PositiveSmallIntegerField(default=7)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class InventoryItem(models.Model):
    ITEM_TYPE_CHOICES = [
        ('consumable', 'Consumable'),
        ('medicine', 'Medicine'),
        ('instrument', 'Instrument'),
        ('equipment', 'Equipment'),
        ('laboratory_material', 'Laboratory Material'),
        ('orthodontic_material', 'Orthodontic Material'),
        ('implant_material', 'Implant Material'),
        ('office_supply', 'Office Supply'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=180)
    sku = models.CharField(max_length=80, unique=True, db_index=True)
    category = models.ForeignKey(
        InventoryCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name='items'
    )
    item_type = models.CharField(max_length=40, choices=ITEM_TYPE_CHOICES, default='consumable')
    unit_of_measure = models.CharField(max_length=40, default='unit')
    description = models.TextField(blank=True)
    default_supplier = models.ForeignKey(
        Supplier, null=True, blank=True, on_delete=models.SET_NULL, related_name='items'
    )
    storage_location = models.ForeignKey(
        InventoryLocation, null=True, blank=True, on_delete=models.SET_NULL, related_name='items'
    )
    reorder_level = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    target_stock_level = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    chargeable_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    allow_negative_stock = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['category', 'item_type']),
        ]

    def __str__(self):
        return f"{self.sku} - {self.name}"

    @property
    def current_stock(self):
        return self.batches.aggregate(total=Sum('quantity_remaining'))['total'] or Decimal('0')

    @property
    def stock_value(self):
        return sum((batch.quantity_remaining * batch.purchase_cost for batch in self.batches.all()), Decimal('0'))


class InventoryBatch(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('depleted', 'Depleted'),
        ('expired', 'Expired'),
        ('quarantined', 'Quarantined'),
    ]

    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='batches')
    batch_number = models.CharField(max_length=120)
    manufacture_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True, db_index=True)
    quantity_received = models.DecimalField(max_digits=12, decimal_places=2)
    quantity_remaining = models.DecimalField(max_digits=12, decimal_places=2)
    supplier = models.ForeignKey(Supplier, null=True, blank=True, on_delete=models.SET_NULL, related_name='batches')
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    storage_location = models.ForeignKey(
        InventoryLocation, null=True, blank=True, on_delete=models.SET_NULL, related_name='batches'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available', db_index=True)
    receipt_reference = models.CharField(max_length=160, blank=True)
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='+')
    received_at = models.DateField(default=date.today)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['expiry_date', 'batch_number']
        indexes = [
            models.Index(fields=['item', 'batch_number']),
            models.Index(fields=['item', 'storage_location']),
            models.Index(fields=['expiry_date']),
        ]
        unique_together = [('item', 'batch_number')]

    def __str__(self):
        return f"{self.item.sku} / {self.batch_number}"

    def refresh_status(self):
        if self.quantity_remaining <= 0:
            self.status = 'depleted'
        elif self.expiry_date and self.expiry_date < date.today():
            self.status = 'expired'
        elif self.status == 'depleted':
            self.status = 'available'


class StockMovement(models.Model):
    MOVEMENT_TYPES = [
        ('receipt', 'Receipt'),
        ('usage', 'Usage'),
        ('adjustment', 'Adjustment'),
        ('transfer_out', 'Transfer Out'),
        ('transfer_in', 'Transfer In'),
        ('return_supplier', 'Return To Supplier'),
        ('po_receipt', 'Purchase Order Receipt'),
    ]

    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, related_name='movements')
    batch = models.ForeignKey(InventoryBatch, null=True, blank=True, on_delete=models.SET_NULL, related_name='movements')
    location = models.ForeignKey(InventoryLocation, null=True, blank=True, on_delete=models.SET_NULL, related_name='movements')
    movement_type = models.CharField(max_length=30, choices=MOVEMENT_TYPES, db_index=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    balance_before = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='+')
    patient_id = models.UUIDField(null=True, blank=True, db_index=True)
    appointment_id = models.UUIDField(null=True, blank=True, db_index=True)
    clinical_note_id = models.UUIDField(null=True, blank=True, db_index=True)
    orthodontic_visit_id = models.PositiveBigIntegerField(null=True, blank=True, db_index=True)
    source_model = models.CharField(max_length=80, blank=True)
    source_id = models.CharField(max_length=80, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['item', 'batch']),
            models.Index(fields=['created_at']),
            models.Index(fields=['movement_type']),
        ]


class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('partially_received', 'Partially Received'),
        ('received', 'Received'),
        ('cancelled', 'Cancelled'),
    ]

    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchase_orders')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft', db_index=True)
    reference = models.CharField(max_length=120, blank=True)
    expected_delivery_date = models.DateField(null=True, blank=True, db_index=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='+')
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def total_cost(self):
        return sum((line.total_cost for line in self.items.all()), Decimal('0'))

    def refresh_status(self):
        items = list(PurchaseOrderItem.objects.filter(purchase_order=self))
        if not items:
            return
        if all(item.quantity_received >= item.quantity_ordered for item in items):
            self.status = 'received'
        elif any(item.quantity_received > 0 for item in items):
            self.status = 'partially_received'


class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, related_name='purchase_order_items')
    quantity_ordered = models.DecimalField(max_digits=12, decimal_places=2)
    quantity_received = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        unique_together = [('purchase_order', 'item')]

    @property
    def total_cost(self):
        return self.quantity_ordered * self.unit_cost


class InventoryAlert(models.Model):
    ALERT_TYPES = [
        ('low_stock', 'Low Stock'),
        ('out_of_stock', 'Out Of Stock'),
        ('expiring_soon', 'Expiring Soon'),
        ('expired', 'Expired'),
        ('overdue_po', 'Overdue Purchase Order'),
    ]
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('acknowledged', 'Acknowledged'),
        ('resolved', 'Resolved'),
    ]

    alert_type = models.CharField(max_length=30, choices=ALERT_TYPES, db_index=True)
    item = models.ForeignKey(InventoryItem, null=True, blank=True, on_delete=models.CASCADE, related_name='alerts')
    batch = models.ForeignKey(InventoryBatch, null=True, blank=True, on_delete=models.CASCADE, related_name='alerts')
    purchase_order = models.ForeignKey(PurchaseOrder, null=True, blank=True, on_delete=models.CASCADE, related_name='alerts')
    message = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open', db_index=True)
    acknowledged_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['status', '-created_at']
        indexes = [
            models.Index(fields=['status', 'alert_type']),
        ]


def create_movement(*, item, batch, location, movement_type, quantity, balance_before, balance_after, user, notes='', **source):
    return StockMovement.objects.create(
        item=item,
        batch=batch,
        location=location,
        movement_type=movement_type,
        quantity=quantity,
        balance_before=balance_before,
        balance_after=balance_after,
        user=user,
        notes=notes,
        **source,
    )


def update_inventory_alerts(item, expiry_days=30):
    today = date.today()
    stock = item.current_stock

    def open_alert(alert_type, message, batch=None):
        InventoryAlert.objects.get_or_create(
            alert_type=alert_type,
            item=item,
            batch=batch,
            status='open',
            defaults={'message': message},
        )

    if stock <= 0:
        open_alert('out_of_stock', f'{item.name} is out of stock.')
    elif stock <= item.reorder_level:
        open_alert('low_stock', f'{item.name} is below reorder level.')

    for batch in item.batches.all():
        if batch.expiry_date and batch.quantity_remaining > 0:
            if batch.expiry_date < today:
                open_alert('expired', f'{item.name} batch {batch.batch_number} has expired.', batch)
            elif batch.expiry_date <= today + timedelta(days=expiry_days):
                open_alert('expiring_soon', f'{item.name} batch {batch.batch_number} expires soon.', batch)


@transaction.atomic
def receive_stock(*, item, batch_number, quantity, user, supplier=None, location=None, purchase_cost=None, manufacture_date=None, expiry_date=None, receipt_reference='', notes='', source_model='', source_id=''):
    quantity = Decimal(str(quantity))
    if quantity <= 0:
        raise ValidationError('Quantity received must be positive.')
    batch, created = InventoryBatch.objects.select_for_update().get_or_create(
        item=item,
        batch_number=batch_number,
        defaults={
            'manufacture_date': manufacture_date,
            'expiry_date': expiry_date,
            'quantity_received': Decimal('0'),
            'quantity_remaining': Decimal('0'),
            'supplier': supplier,
            'purchase_cost': purchase_cost if purchase_cost is not None else item.unit_cost,
            'storage_location': location or item.storage_location,
            'receipt_reference': receipt_reference,
            'received_by': user,
            'received_at': date.today(),
        },
    )
    before = batch.quantity_remaining
    batch.quantity_received += quantity
    batch.quantity_remaining += quantity
    if supplier:
        batch.supplier = supplier
    if location:
        batch.storage_location = location
    if purchase_cost is not None:
        batch.purchase_cost = purchase_cost
    if manufacture_date:
        batch.manufacture_date = manufacture_date
    if expiry_date:
        batch.expiry_date = expiry_date
    batch.refresh_status()
    batch.save()
    create_movement(
        item=item, batch=batch, location=batch.storage_location, movement_type='receipt',
        quantity=quantity, balance_before=before, balance_after=batch.quantity_remaining,
        user=user, notes=notes or receipt_reference, source_model=source_model, source_id=source_id,
    )
    update_inventory_alerts(item)
    return batch


@transaction.atomic
def issue_stock(*, item, quantity, user, batch=None, location=None, notes='', **source):
    quantity = Decimal(str(quantity))
    if quantity <= 0:
        raise ValidationError('Quantity issued must be positive.')
    qs = InventoryBatch.objects.select_for_update().filter(item=item, quantity_remaining__gt=0)
    if batch:
        qs = qs.filter(pk=batch.pk)
    if location:
        qs = qs.filter(storage_location=location)
    qs = qs.order_by('expiry_date', 'created_at')
    remaining = quantity
    touched = []
    for current in qs:
        if remaining <= 0:
            break
        before = current.quantity_remaining
        take = min(before, remaining)
        current.quantity_remaining -= take
        current.refresh_status()
        current.save()
        create_movement(
            item=item, batch=current, location=current.storage_location, movement_type='usage',
            quantity=-take, balance_before=before, balance_after=current.quantity_remaining,
            user=user, notes=notes, **source,
        )
        touched.append(current)
        remaining -= take
    if remaining > 0 and not item.allow_negative_stock:
        raise ValidationError('Insufficient stock. Negative stock is not permitted for this item.')
    update_inventory_alerts(item)
    return touched


@transaction.atomic
def adjust_stock(*, batch, quantity_delta, user, movement_type='adjustment', notes='', location=None):
    quantity_delta = Decimal(str(quantity_delta))
    if not notes:
        raise ValidationError('Adjustment reason is required.')
    locked = InventoryBatch.objects.select_for_update().get(pk=batch.pk)
    before = locked.quantity_remaining
    after = before + quantity_delta
    if after < 0 and not locked.item.allow_negative_stock:
        raise ValidationError('Adjustment would create negative stock.')
    locked.quantity_remaining = after
    if location:
        locked.storage_location = location
    locked.refresh_status()
    locked.save()
    create_movement(
        item=locked.item, batch=locked, location=locked.storage_location, movement_type=movement_type,
        quantity=quantity_delta, balance_before=before, balance_after=locked.quantity_remaining,
        user=user, notes=notes,
    )
    update_inventory_alerts(locked.item)
    return locked
