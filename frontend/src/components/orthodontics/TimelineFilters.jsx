export default function TimelineFilters({ value, onChange }) {
  const options = [
    { value: 'all', label: 'All' },
    { value: 'case', label: 'Cases' },
    { value: 'visit', label: 'Visits' },
    { value: 'photo', label: 'Photos' },
    { value: 'document', label: 'Documents' },
  ]

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange?.(option.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
            value === option.value ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
