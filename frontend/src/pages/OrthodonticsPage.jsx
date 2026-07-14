import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import { getOrthodonticCases } from '../services/clinical.service'

function StatCard({ title, value }) {
  return (
    <div className="bg-white shadow rounded-xl p-5">
      <p className="text-gray-500">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  )
}

export default function OrthodonticsPage() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCases()
  }, [])

  async function loadCases() {
    try {
      setLoading(true)
      const data = await getOrthodonticCases()
      setCases(data)
    } catch (error) {
      console.error(error)
      setCases([])
    } finally {
      setLoading(false)
    }
  }

  const active = cases.filter(c => c.status === 'active').length
  const retention = cases.filter(c => c.status === 'retention').length
  const completed = cases.filter(c => c.status === 'completed').length
  const reviewsDue = cases.length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Orthodontics</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Active Cases" value={active} />
          <StatCard title="Retention" value={retention} />
          <StatCard title="Completed" value={completed} />
          <StatCard title="Reviews Due" value={reviewsDue} />
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-xl font-semibold mb-4">
            Case Registry
          </h2>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left">Patient</th>
                  <th className="p-3 text-left">Appliance</th>
                  <th className="p-3 text-left">Stage</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>

              <tbody>
                {cases.map(orthoCase => (
                  <tr key={orthoCase.id} className="border-b">
                    <td className="p-3">{orthoCase.patient_name}</td>
                    <td className="p-3">{orthoCase.appliance_type}</td>
                    <td className="p-3">{orthoCase.stage}</td>
                    <td className="p-3">{orthoCase.status}</td>
                  </tr>
                ))}

                {cases.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-500">
                      No orthodontic cases yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
