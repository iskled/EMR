import ClinicalWorkspace from '../clinical/ClinicalWorkspace'

export default function PatientWorkspace({ patient }) {
  if (!patient) {
    return (
      <div className="bg-white rounded-2xl shadow p-10 text-gray-500">
        Select a patient
      </div>
    )
  }

  return (
    <ClinicalWorkspace
      patient={patient}
    />
  )
}