export default function UserMetrics({ metrics }) {
  const cards = [
    ['total_users', 'Users'],
    ['active_users', 'Active'],
    ['inactive_users', 'Inactive'],
    ['locked_users', 'Locked'],
    ['force_password_change', 'Forced changes'],
  ]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map(([key, label]) => (
        <div key={key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{metrics?.[key] ?? 0}</p>
        </div>
      ))}
    </div>
  )
}
