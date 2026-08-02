const metricLabels = {
  total_open: 'Open',
  pending_acceptance: 'Pending',
  accepted: 'Accepted',
  in_progress: 'In Progress',
  waiting_for_vendor: 'Waiting for Vendor',
  waiting_for_staff: 'Waiting for Staff',
  resolved: 'Resolved',
  closed_today: 'Closed Today',
  overdue: 'Overdue',
  unread_notifications: 'Unread',
}

export default function TaskMetrics({ metrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
      {Object.entries(metricLabels).map(([key, label]) => (
        <div key={key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className={`mt-2 text-2xl font-bold ${['overdue', 'unread_notifications'].includes(key) ? 'text-red-600' : 'text-gray-900'}`}>
            {metrics?.[key] ?? 0}
          </p>
        </div>
      ))}
    </div>
  )
}
