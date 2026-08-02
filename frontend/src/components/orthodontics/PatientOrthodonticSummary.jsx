import CaseStatusBadge from './CaseStatusBadge'

export default function PatientOrthodonticSummary({ orthoCase }) {
  if (!orthoCase) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
        No orthodontic case linked to this patient.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Orthodontic Summary</h3>
          <p className="text-sm text-gray-500">{orthoCase.stage || 'Stage not set'}</p>
        </div>
        <CaseStatusBadge status={orthoCase.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-gray-500">Progress</p><p className="font-semibold">{orthoCase.progress_percent || 0}%</p></div>
        <div><p className="text-gray-500">Latest Visit</p><p className="font-semibold">{orthoCase.last_visit?.visit_date || 'None'}</p></div>
        <div><p className="text-gray-500">Next Review</p><p className="font-semibold">{orthoCase.next_review_date || 'Not scheduled'}</p></div>
        <div><p className="text-gray-500">Appliances</p><p className="font-semibold">{orthoCase.appliance_type || 'Not set'}</p></div>
      </div>
    </div>
  )
}
