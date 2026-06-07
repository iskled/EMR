import React from 'react'

export default function ClinicalBanner({ patient }) {
  if (!patient) return null

  return (
    <div
      className="bg-white border rounded-lg p-4 mb-4 shadow-sm"
    >
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold">
            {patient.first_name} {patient.last_name}
          </h2>

          <div className="text-sm text-gray-500 mt-1">
            Patient Code:
            {' '}
            {patient.patient_code}
          </div>

          <div className="text-sm text-gray-500">
            Phone:
            {' '}
            {patient.phone}
          </div>
        </div>

        <div className="text-right">
          <div className="font-semibold">
            {patient.gender || 'Unknown'}
          </div>

          <div className="text-sm text-gray-500">
            {patient.date_of_birth || 'No DOB'}
          </div>

          <div className="text-sm text-red-600">
            {patient.medical_alerts ||
              'No Alerts'}
          </div>
        </div>
      </div>
    </div>
  )
}