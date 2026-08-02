export default function ProgressTracker({ orthoCase }) {
  const progress = Number(orthoCase?.progress_percent || 0)
  const remaining = orthoCase?.estimated_remaining_months

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Treatment Progress</h3>
          <p className="text-sm text-gray-500">{orthoCase?.stage || 'No current stage set'}</p>
        </div>
        <span className="text-2xl font-bold text-gray-900">{progress}%</span>
      </div>
      <div className="mt-4 h-3 rounded-full bg-gray-100">
        <div className="h-3 rounded-full bg-blue-600" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-gray-500">Visits</p>
          <p className="font-semibold">{orthoCase?.completed_visit_count || orthoCase?.visits?.length || 0}</p>
        </div>
        <div>
          <p className="text-gray-500">Remaining</p>
          <p className="font-semibold">{remaining ?? 'N/A'} months</p>
        </div>
        <div>
          <p className="text-gray-500">Completion</p>
          <p className="font-semibold">{orthoCase?.estimated_completion || 'TBD'}</p>
        </div>
      </div>
    </div>
  )
}
