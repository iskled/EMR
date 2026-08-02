
import Sidebar from '../components/navigation/Sidebar'
import Topbar from '../components/navigation/Topbar'

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="min-w-0 flex-1 flex flex-col">
        <Topbar />

        <main className="overflow-x-hidden p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
