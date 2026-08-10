import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import Button from '../components/ui/Button'
import InventoryDashboard from '../components/inventory/InventoryDashboard'
import InventoryFilters from '../components/inventory/InventoryFilters'
import InventoryTable from '../components/inventory/InventoryTable'
import InventoryItemModal from '../components/inventory/InventoryItemModal'
import SupplierPanel from '../components/inventory/SupplierPanel'
import BatchPanel from '../components/inventory/BatchPanel'
import StockReceiptModal from '../components/inventory/StockReceiptModal'
import StockUsageModal from '../components/inventory/StockUsageModal'
import StockAdjustmentModal from '../components/inventory/StockAdjustmentModal'
import PurchaseOrderPanel from '../components/inventory/PurchaseOrderPanel'
import PurchaseOrderModal from '../components/inventory/PurchaseOrderModal'
import InventoryAlerts from '../components/inventory/InventoryAlerts'
import StockMovementTimeline from '../components/inventory/StockMovementTimeline'
import ExpiryReportPanel from '../components/inventory/ExpiryReportPanel'
import {
  getInventoryAlerts,
  getInventoryBatches,
  getInventoryCategories,
  getInventoryDashboard,
  getInventoryItems,
  getInventoryLocations,
  getPurchaseOrders,
  getStockMovements,
  getSuppliers,
} from '../services/inventory.service'
import { hasPermission } from '../permissions/permissions'

const initialFilters = { search: '', category: '', storage_location: '', is_active: '' }
const tabs = ['Dashboard', 'Items', 'Suppliers', 'Batches', 'Purchase Orders', 'Alerts', 'Movements']

export default function InventoryPage() {
  const { user } = useAuth() || {}
  const canCreate = hasPermission(user, 'inventory.create')
  const canReceive = hasPermission(user, 'inventory.receive')
  const canUse = hasPermission(user, 'inventory.usage')
  const canAdjust = hasPermission(user, 'inventory.adjust_decrease')
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [filters, setFilters] = useState(initialFilters)
  const [dashboard, setDashboard] = useState(null)
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [batches, setBatches] = useState([])
  const [orders, setOrders] = useState([])
  const [alerts, setAlerts] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [itemModal, setItemModal] = useState(false)
  const [receiptModal, setReceiptModal] = useState(false)
  const [usageModal, setUsageModal] = useState(false)
  const [adjustModal, setAdjustModal] = useState(false)
  const [poModal, setPoModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    refreshAll()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(loadItems, 250)
    return () => clearTimeout(timeout)
  }, [filters])

  async function loadItems() {
    const params = {}
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '') params[key] = value
    })
    try {
      const data = await getInventoryItems(params)
      setItems(data)
    } catch {
      setError('Unable to load inventory items.')
    }
  }

  async function refreshAll() {
    try {
      setLoading(true)
      setError('')
      const [dashboardData, itemData, categoryData, locationData, supplierData, batchData, orderData, alertData, movementData] = await Promise.all([
        getInventoryDashboard(),
        getInventoryItems(),
        getInventoryCategories(),
        getInventoryLocations(),
        getSuppliers(),
        getInventoryBatches(),
        getPurchaseOrders(),
        getInventoryAlerts({ status: 'open' }),
        getStockMovements(),
      ])
      setDashboard(dashboardData)
      setItems(itemData)
      setCategories(categoryData)
      setLocations(locationData)
      setSuppliers(supplierData)
      setBatches(batchData)
      setOrders(orderData)
      setAlerts(alertData)
      setMovements(movementData)
    } catch {
      setError('Unable to load inventory workspace.')
    } finally {
      setLoading(false)
    }
  }

  function openModal(type, item = null) {
    setSelectedItem(item)
    if (type === 'item') setItemModal(true)
    if (type === 'receipt') setReceiptModal(true)
    if (type === 'usage') setUsageModal(true)
    if (type === 'adjust') setAdjustModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">Dental stock control, batches, expiry, purchase orders, alerts, and movement history.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canCreate && <Button type="button" onClick={() => openModal('item')}>New Item</Button>}
          {canReceive && <Button type="button" onClick={() => setPoModal(true)} className="bg-emerald-700 hover:bg-emerald-800">New PO</Button>}
          <Button type="button" onClick={refreshAll} className="bg-gray-700 hover:bg-gray-800">Refresh</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
        {tabs.map(tab => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-md px-3 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Dashboard' && <InventoryDashboard dashboard={dashboard} loading={loading} />}

      {activeTab === 'Items' && (
        <div className="space-y-4">
          <InventoryFilters filters={filters} categories={categories} locations={locations} onChange={setFilters} onReset={() => setFilters(initialFilters)} />
          <InventoryTable
            items={items}
            loading={loading}
            error={error}
            onEdit={item => openModal('item', item)}
            onReceive={item => openModal('receipt', item)}
            onUse={item => openModal('usage', item)}
            onAdjust={item => openModal('adjust', item)}
            canEdit={canCreate}
            canReceive={canReceive}
            canUse={canUse}
            canAdjust={canAdjust}
          />
        </div>
      )}

      {activeTab === 'Suppliers' && <SupplierPanel suppliers={suppliers} categories={categories} locations={locations} onChanged={refreshAll} />}
      {activeTab === 'Batches' && <div className="space-y-4"><BatchPanel batches={batches} /><ExpiryReportPanel batches={batches} /></div>}
      {activeTab === 'Purchase Orders' && <PurchaseOrderPanel orders={orders} onNew={canReceive ? () => setPoModal(true) : null} onChanged={refreshAll} canReceive={canReceive} />}
      {activeTab === 'Alerts' && <InventoryAlerts alerts={alerts} onChanged={refreshAll} />}
      {activeTab === 'Movements' && <StockMovementTimeline movements={movements} />}

      {canCreate && <InventoryItemModal open={itemModal} item={selectedItem} categories={categories} suppliers={suppliers} locations={locations} onClose={() => setItemModal(false)} onSaved={refreshAll} />}
      {canReceive && <StockReceiptModal open={receiptModal} item={selectedItem} suppliers={suppliers} locations={locations} onClose={() => setReceiptModal(false)} onSaved={refreshAll} />}
      {canUse && <StockUsageModal open={usageModal} item={selectedItem} batches={batches} onClose={() => setUsageModal(false)} onSaved={refreshAll} />}
      {canAdjust && <StockAdjustmentModal open={adjustModal} item={selectedItem} batches={batches} locations={locations} onClose={() => setAdjustModal(false)} onSaved={refreshAll} />}
      {canReceive && <PurchaseOrderModal open={poModal} suppliers={suppliers} items={items} onClose={() => setPoModal(false)} onSaved={refreshAll} />}
    </div>
  )
}
