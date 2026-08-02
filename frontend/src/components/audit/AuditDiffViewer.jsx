function JsonBlock({ title, value }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-gray-900">{title}</p>
      <pre className="max-h-72 overflow-auto rounded-md bg-gray-950 p-3 text-xs text-gray-100">
        {JSON.stringify(value || {}, null, 2)}
      </pre>
    </div>
  )
}

export default function AuditDiffViewer({ event }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <JsonBlock title="Previous values" value={event.previous_values} />
      <JsonBlock title="New values" value={event.new_values} />
    </div>
  )
}
