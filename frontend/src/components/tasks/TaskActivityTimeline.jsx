export default function TaskActivityTimeline({ task }) {
  const items = [
    ...(task.assignment_history || []).map(row => ({
      id: `assignment-${row.id}`,
      label: `Assigned to ${row.to_user_name || row.to_role || 'unassigned'}`,
      date: row.changed_at,
    })),
    ...(task.comments || []).map(row => ({
      id: `comment-${row.id}`,
      label: `Comment by ${row.author_name}`,
      date: row.created_at,
    })),
    ...(task.alerts || []).map(row => ({
      id: `alert-${row.id}`,
      label: `${row.alert_type.replaceAll('_', ' ')} alert ${row.status}`,
      date: row.created_at,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-gray-900">Activity</h3>
      <div className="mt-3 space-y-2">
        {items.map(item => (
          <div key={item.id} className="border-l-2 border-blue-200 pl-3 text-sm">
            <p className="text-gray-800">{item.label}</p>
            <p className="text-xs text-gray-500">{new Date(item.date).toLocaleString()}</p>
          </div>
        ))}
        {!items.length && <p className="text-sm text-gray-500">No activity yet.</p>}
      </div>
    </section>
  )
}
