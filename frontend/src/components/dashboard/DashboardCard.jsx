
export default function DashboardCard({ title, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <p className="text-sm text-gray-500">{title}</p>

      <h3 className="text-4xl font-bold mt-2 text-blue-600">
        {value}
      </h3>
    </div>
  )
}
