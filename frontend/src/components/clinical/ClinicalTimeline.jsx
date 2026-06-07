import { useEffect, useState } from 'react'

import Loader from '../ui/Loader'
import EmptyState from '../ui/EmptyState'
import Badge from '../ui/Badge'

import {
  getClinicalNotes,
} from '../../services/clinical.service'

export default function ClinicalTimeline({
  patient,
}) {
  const [loading, setLoading] =
    useState(true)

  const [notes, setNotes] =
    useState([])

  useEffect(() => {
    if (!patient) return

    loadTimeline()
  }, [patient])

  async function loadTimeline() {
    try {
      setLoading(true)

      const response =
        await getClinicalNotes(
          patient.id
        )

      const data =
        response.data.results ||
        response.data

      setNotes(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loader />
  }

  if (!notes.length) {
    return (
      <EmptyState
        title="No clinical notes"
      />
    )
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <div
          key={note.id}
          className="
            bg-white
            rounded-2xl
            shadow
            p-5
          "
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">
                {note.note_type}
              </h3>

              <p className="text-sm text-gray-500">
                {note.note_date}
              </p>
            </div>

            <div className="flex gap-2">
              {note.is_signed && (
                <Badge variant="success">
                  Signed
                </Badge>
              )}

              {note.tooth_number && (
                <Badge variant="info">
                  T{note.tooth_number}
                </Badge>
              )}
            </div>
          </div>

          {note.chief_complaint && (
            <div className="mt-4">
              <h4 className="font-medium">
                Chief Complaint
              </h4>

              <p className="text-gray-700">
                {note.chief_complaint}
              </p>
            </div>
          )}

          {note.diagnosis && (
            <div className="mt-4">
              <h4 className="font-medium">
                Diagnosis
              </h4>

              <p className="text-gray-700">
                {note.diagnosis}
              </p>
            </div>
          )}

          {note.treatment_performed && (
            <div className="mt-4">
              <h4 className="font-medium">
                Treatment
              </h4>

              <p className="text-gray-700">
                {note.treatment_performed}
              </p>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">
            Provider:
            {' '}
            {note.dentist_name}
          </div>
        </div>
      ))}
    </div>
  )
}