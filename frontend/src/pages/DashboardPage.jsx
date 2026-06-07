
import DashboardLayout from '../layouts/DashboardLayout'
import DashboardCard from '../components/dashboard/DashboardCard'

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Dashboard
          </h1>

          <p className="text-gray-500 mt-1">
            Enterprise Dental Clinic Management Platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <DashboardCard title="Total Patients" value="1,248" />
          <DashboardCard title="Today's Appointments" value="28" />
          <DashboardCard title="Pending Tasks" value="12" />
          <DashboardCard title="Unpaid Invoices" value="7" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">
            2026 Enterprise EMR Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>• Role-based access control</div>
            <div>• Chair-side clinical workflow</div>
            <div>• Treatment planning engine</div>
            <div>• Integrated billing architecture</div>
            <div>• Inventory tracking</div>
            <div>• Task delegation workflows</div>
            <div>• Clinical audit logging</div>
            <div>• Patient communication module</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
