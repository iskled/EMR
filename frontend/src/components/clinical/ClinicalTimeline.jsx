import { useEffect, useState } from 'react'
import { getClinicalTimeline } from '../../services/clinical.service'

export default function ClinicalTimeline({ patient }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!patient?.id) {
      setEvents([])
      return
    }

    loadTimeline()
  }, [patient])

  async function loadTimeline() {
    try {
      setLoading(true)
      const data = await getClinicalTimeline(patient.id)
      setEvents(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded shadow p-5 text-gray-500">
        Loading timeline...
      </div>
    )
  }

  if (!events.length) {
    return (
      <div className="bg-white rounded shadow p-5 text-gray-500">
        No clinical timeline events found.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {events.map(event => (
        <div
          key={event.id}
          className="bg-white rounded shadow p-5"
        >
          <div className="flex justify-between">
            <h3 className="font-bold">{event.title}</h3>
            <span>{event.date}</span>
          </div>

          <p className="text-gray-600 mt-2">
            {event.subtitle}
          </p>

          <p className="text-sm text-gray-500 mt-3">
            Type: {event.event_type}
          </p>
        </div>
      ))}
    </div>
  )
}
