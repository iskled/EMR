export default function SecurityDashboard({ data }) {
  const cards = [
    ['open_alerts', 'Open alerts'],
    ['critical_alerts', 'Critical'],
    ['failed_logins_7d', 'Failed logins'],
    ['locked_accounts', 'Locked accounts'],
    ['denied_access_7d', 'Denied access'],
    ['exports_7d', 'Exports'],
  ]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      {cards.map(([key, label]) => (
        <div key={key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{data?.[key] ?? 0}</p>
        </div>
      ))}
    </div>
  )
}
