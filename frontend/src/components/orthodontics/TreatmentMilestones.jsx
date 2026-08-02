export default function TreatmentMilestones({ milestones = [] }) {
  const defaults = [
    'Initial Consultation',
    'Diagnostic Records',
    'Bonding',
    'Adjustment Visits',
    'Wire Changes',
    'Elastic Reviews',
    'Appliance Repairs',
    'Debond',
    'Retention Review',
    'Completed',
  ]
  const items = milestones.length ? milestones : defaults.map(label => ({ label, completed: false }))

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900">Treatment Milestones</h3>
      <div className="mt-4 space-y-2">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${item.completed ? 'bg-blue-600' : 'bg-gray-300'}`} />
            <span className={item.completed ? 'font-semibold text-gray-900' : 'text-gray-600'}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
