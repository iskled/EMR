import api from '../api/axios'

export const ITEM_TYPES = [
  { value: 'consumable', label: 'Consumable' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'instrument', label: 'Instrument' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'laboratory_material', label: 'Laboratory Material' },
  { value: 'orthodontic_material', label: 'Orthodontic Material' },
  { value: 'implant_material', label: 'Implant Material' },
  { value: 'office_supply', label: 'Office Supply' },
  { value: 'other', label: 'Other' },
]

export function unwrapList(data) {
  if (Array.isArray(data)) return data
  return data?.results || []
}

export const getInventoryDashboard = async () => {
  const response = await api.get('/inventory-items/dashboard/')
  return response.data
}

export const getInventoryItems = async (params = {}) => {
  const response = await api.get('/inventory-items/', { params })
  return unwrapList(response.data)
}

export const createInventoryItem = async payload => {
  const response = await api.post('/inventory-items/', payload)
  return response.data
}

export const updateInventoryItem = async (id, payload) => {
  const response = await api.patch(`/inventory-items/${id}/`, payload)
  return response.data
}

export const getInventoryCategories = async (params = {}) => {
  const response = await api.get('/inventory-categories/', { params })
  return unwrapList(response.data)
}

export const createInventoryCategory = async payload => {
  const response = await api.post('/inventory-categories/', payload)
  return response.data
}

export const getInventoryLocations = async (params = {}) => {
  const response = await api.get('/inventory-locations/', { params })
  return unwrapList(response.data)
}

export const createInventoryLocation = async payload => {
  const response = await api.post('/inventory-locations/', payload)
  return response.data
}

export const getSuppliers = async (params = {}) => {
  const response = await api.get('/inventory-suppliers/', { params })
  return unwrapList(response.data)
}

export const createSupplier = async payload => {
  const response = await api.post('/inventory-suppliers/', payload)
  return response.data
}

export const getInventoryBatches = async (params = {}) => {
  const response = await api.get('/inventory-batches/', { params })
  return unwrapList(response.data)
}

export const receiveStock = async payload => {
  const response = await api.post('/inventory-items/receipt/', payload)
  return response.data
}

export const issueStock = async payload => {
  const response = await api.post('/inventory-items/usage/', payload)
  return response.data
}

export const adjustStock = async payload => {
  const response = await api.post('/inventory-items/adjustment/', payload)
  return response.data
}

export const transferStock = async payload => {
  const response = await api.post('/inventory-items/transfer/', payload)
  return response.data
}

export const getStockMovements = async (params = {}) => {
  const response = await api.get('/inventory-movements/', { params })
  return unwrapList(response.data)
}

export const getPurchaseOrders = async (params = {}) => {
  const response = await api.get('/inventory-purchase-orders/', { params })
  return unwrapList(response.data)
}

export const createPurchaseOrder = async payload => {
  const response = await api.post('/inventory-purchase-orders/', payload)
  return response.data
}

export const submitPurchaseOrder = async id => {
  const response = await api.post(`/inventory-purchase-orders/${id}/submit/`)
  return response.data
}

export const receivePurchaseOrder = async (id, payload = {}) => {
  const response = await api.post(`/inventory-purchase-orders/${id}/receive/`, payload)
  return response.data
}

export const getInventoryAlerts = async (params = {}) => {
  const response = await api.get('/inventory-alerts/', { params })
  return unwrapList(response.data)
}

export const acknowledgeAlert = async id => {
  const response = await api.post(`/inventory-alerts/${id}/acknowledge/`)
  return response.data
}

export const resolveAlert = async id => {
  const response = await api.post(`/inventory-alerts/${id}/resolve/`)
  return response.data
}
