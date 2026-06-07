export default function PatientTable({ patients, selectedPatient, onSelect }) {
  return (
    <div className='bg-white rounded-2xl shadow overflow-hidden'>
      <table className='w-full'>
        <thead className='bg-gray-100'>
          <tr>
            <th className='p-4 text-left'>Code</th>
            <th className='p-4 text-left'>Patient</th>
            <th className='p-4 text-left'>Phone</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id} onClick={() => onSelect(patient)} className={`border-t cursor-pointer hover:bg-gray-50 ${selectedPatient?.id === patient.id ? 'bg-blue-50' : ''}`}>
              <td className='p-4'>{patient.patient_code}</td>
              <td className='p-4'>{patient.first_name} {patient.last_name}</td>
              <td className='p-4'>{patient.phone_primary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
