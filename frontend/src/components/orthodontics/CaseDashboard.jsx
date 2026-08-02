import CaseStatusBadge from './CaseStatusBadge'
import ProgressCard from './ProgressCard'

export default function CaseDashboard({ cases = [], selectedCase, loading, error }) {
  const active = cases.filter(item => item.status === 'active').length
  const completed = cases.filter(item => item.status === 'completed').length
  const totalVisits = cases.reduce((sum, item) => sum + Number(item.completed_visit_count || item.visits?.length || 0), 0)
  const avgProgress = cases.length
    ? Math.round(cases.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / cases.length)
    : 0

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <ProgressCard title="Active Cases" value={loading ? '...' : active} />
        <ProgressCard title="Completed Cases" value={loading ? '...' : completed} />
        <ProgressCard title="Completed Visits" value={loading ? '...' : totalVisits} />
        <ProgressCard title="Average Progress" value={loading ? '...' : `${avgProgress}%`} />
      </div>

      {selectedCase ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedCase.patient_name}</h2>
              <p className="text-sm text-gray-500">{selectedCase.diagnosis || 'No diagnosis recorded'}</p>
            </div>
            <CaseStatusBadge status={selectedCase.status} />
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Stage</p>
              <p className="font-semibold">{selectedCase.stage || 'Not set'}</p>
            </div>
            <div>
              <p className="text-gray-500">Duration</p>
              <p className="font-semibold">{selectedCase.treatment_duration_months || selectedCase.estimated_duration_months || 0} months</p>
            </div>
            <div>
              <p className="text-gray-500">Last Visit</p>
              <p className="font-semibold">{selectedCase.last_visit?.visit_date || 'None'}</p>
            </div>
            <div>
              <p className="text-gray-500">Next Review</p>
              <p className="font-semibold">{selectedCase.next_review_date || 'Not scheduled'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
          {loading ? 'Loading orthodontic cases...' : 'Select or create an orthodontic case.'}
        </div>
      )}
    </div>
  )
}
