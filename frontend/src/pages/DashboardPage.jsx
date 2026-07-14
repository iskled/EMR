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
          <DashboardCard title="Total Patients" value="API required" />
          <DashboardCard title="Today's Appointments" value="API required" />
          <DashboardCard title="Pending Tasks" value="Not implemented" />
          <DashboardCard title="Unpaid Invoices" value="Not implemented" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">
            Current Architecture Status
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>Role-based access control: backend permissions exist</div>
            <div>Chair-side clinical workflow: components exist, route pending</div>
            <div>Treatment planning engine: backend and service exist</div>
            <div>Integrated billing architecture: backend API pending</div>
            <div>Inventory tracking: not implemented</div>
            <div>Task workflows: not implemented</div>
            <div>Clinical audit logging: backend mixin exists</div>
            <div>Patient communication module: not implemented</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
