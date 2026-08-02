from django.contrib import admin

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
)


admin.site.register(InventoryCategory)
admin.site.register(InventoryLocation)
admin.site.register(Supplier)
admin.site.register(InventoryItem)
admin.site.register(InventoryBatch)
admin.site.register(StockMovement)
admin.site.register(PurchaseOrder)
admin.site.register(PurchaseOrderItem)
admin.site.register(InventoryAlert)
