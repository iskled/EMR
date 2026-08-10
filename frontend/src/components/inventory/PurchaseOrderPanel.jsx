import Button from '../ui/Button'
import {
  receivePurchaseOrder,
  submitPurchaseOrder,
} from '../../services/inventory.service'
import { formatCurrency } from '../../utils/currency'

export default function PurchaseOrderPanel({ orders = [], onNew, onChanged, canReceive = false }) {
  async function submit(id) {
    await submitPurchaseOrder(id)
    await onChanged?.()
  }

  async function receive(id) {
    await receivePurchaseOrder(id)
    await onChanged?.()
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Purchase Orders</h3>
        {canReceive && (
          <Button type="button" onClick={onNew}>
            New PO
          </Button>
        )}
      </div>
      <div className="mt-4 space-y-3">
        {orders.map(order => (
          <div key={order.id} className="rounded border border-gray-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {order.reference || `PO-${order.id}`}
                </p>
                <p className="text-sm text-gray-500">
                  {order.supplier_name} - {order.status} - {formatCurrency(order.total_cost)}
                </p>
              </div>
              <div className="flex gap-2">
                {canReceive && order.status === 'draft' && (
                  <button
                    className="font-semibold text-blue-700 hover:underline"
                    onClick={() => submit(order.id)}
                  >
                    Submit
                  </button>
                )}
                {canReceive && ['submitted', 'partially_received'].includes(order.status) && (
                  <button
                    className="font-semibold text-emerald-700 hover:underline"
                    onClick={() => receive(order.id)}
                  >
                    Receive
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!orders.length && (
          <p className="text-sm text-gray-500">No purchase orders.</p>
        )}
      </div>
    </div>
  )
}
