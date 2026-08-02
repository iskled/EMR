from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'inventory-categories', views.InventoryCategoryViewSet, basename='inventory-category')
router.register(r'inventory-locations', views.InventoryLocationViewSet, basename='inventory-location')
router.register(r'inventory-suppliers', views.SupplierViewSet, basename='inventory-supplier')
router.register(r'inventory-items', views.InventoryItemViewSet, basename='inventory-item')
router.register(r'inventory-batches', views.InventoryBatchViewSet, basename='inventory-batch')
router.register(r'inventory-movements', views.StockMovementViewSet, basename='inventory-movement')
router.register(r'inventory-purchase-orders', views.PurchaseOrderViewSet, basename='inventory-purchase-order')
router.register(r'inventory-alerts', views.InventoryAlertViewSet, basename='inventory-alert')

urlpatterns = [
    path('', include(router.urls)),
]
