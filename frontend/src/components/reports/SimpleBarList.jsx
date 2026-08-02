export default function SimpleBarList({ title, rows = [], labelKey, valueKey = 'count' }) {
  const max = Math.max(...rows.map(row => Math.abs(Number(row[valueKey] || 0))), 1)
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.slice(0, 10).map((row, index) => {
          const label = typeof labelKey === 'function' ? labelKey(row) : row[labelKey]
          const value = Number(row[valueKey] || 0)
          return (
            <div key={`${label}-${index}`}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="truncate text-gray-700">{label || 'Unspecified'}</span>
                <span className="font-semibold text-gray-900">{value}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min((Math.abs(value) / max) * 100, 100)}%` }} />
              </div>
            </div>
          )
        })}
        {!rows.length && <p className="text-sm text-gray-500">No data for the active filters.</p>}
      </div>
    </div>
  )
}
