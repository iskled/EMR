import DashboardLayout from '../layouts/DashboardLayout'

export default function BillingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Billing</h1>

        <div className="bg-white rounded shadow p-5">
          <p className="text-gray-500">Billing module</p>
          <p className="text-xl font-semibold mt-2">
            Backend billing API is not implemented yet.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
