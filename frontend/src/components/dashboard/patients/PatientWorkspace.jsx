export default function PatientWorkspace({ patient }) {
  if (!patient) return <div className='bg-white rounded-2xl shadow p-10 text-gray-500'>Select a patient</div>

  return (
    <div className='bg-white rounded-2xl shadow p-6'>
      <h2 className='text-2xl font-bold mb-4'>{patient.first_name} {patient.last_name}</h2>
      <div className='space-y-2'>
        <p><strong>Patient Code:</strong> {patient.patient_code}</p>
        <p><strong>Phone:</strong> {patient.phone_primary}</p>
      </div>
    </div>
  )
}
