const metricLabels = {
  total_open: 'Open',
  my_tasks: 'Mine',
  team_tasks: 'Team',
  due_today: 'Due Today',
  overdue: 'Overdue',
  urgent: 'Urgent',
  blocked: 'Blocked',
  unassigned: 'Unassigned',
}

export default function TaskMetrics({ metrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
      {Object.entries(metricLabels).map(([key, label]) => (
        <div key={key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className={`mt-2 text-2xl font-bold ${key === 'overdue' ? 'text-red-600' : 'text-gray-900'}`}>
            {metrics?.[key] ?? 0}
          </p>
        </div>
      ))}
    </div>
  )
}
