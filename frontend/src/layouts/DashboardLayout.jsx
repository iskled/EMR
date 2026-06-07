
import Sidebar from '../components/navigation/Sidebar'
import Topbar from '../components/navigation/Topbar'

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Topbar />

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
