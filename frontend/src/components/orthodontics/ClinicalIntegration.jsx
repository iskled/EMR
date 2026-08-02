export default function ClinicalIntegration({ orthoCase, onOpenPatient, onOpenAppointment }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900">Clinical Integration</h3>
      <p className="mt-1 text-sm text-gray-500">
        Orthodontic cases are patient-owned. Any authorised dentist can continue treatment, while visits preserve treating dentist history.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpenPatient?.(orthoCase)} className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white">
          Patient Workspace
        </button>
        <button type="button" onClick={() => onOpenAppointment?.(orthoCase)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          Create Review Appointment
        </button>
      </div>
    </div>
  )
}
