import { useState } from 'react'
import AppointmentStatusBadge from './AppointmentStatusBadge'
import AppointmentTimeline from './AppointmentTimeline'
import { STATUS_OPTIONS } from '../../services/appointments.service'

const allowedTransitions = [
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]

export default function AppointmentDrawer({
  appointment,
  open,
  onClose,
  onClinical,
  onBilling,
  onStatusChange,
  onEdit,
  patientHistory = [],
  orthodonticCase = null,
}) {
  const [cancellationReason, setCancellationReason] = useState('')
  const [statusError, setStatusError] = useState('')

  if (!open || !appointment) return null

  async function changeStatus(status) {
    setStatusError('')

    if (status === 'cancelled' && !cancellationReason.trim()) {
      setStatusError('Cancellation reason is required.')
      return
    }

    try {
      await onStatusChange?.(appointment, status, {
        cancellation_reason: cancellationReason,
      })
      setCancellationReason('')
    } catch {
      setStatusError('Unable to update status.')
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="flex justify-between items-start border-b border-gray-200 p-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Appointment Details
            </h2>
            <p className="text-sm text-gray-500">
              {appointment.scheduled_date} · {appointment.start_time} - {appointment.end_time}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-gray-600 hover:bg-gray-100"
            aria-label="Close appointment details"
          >
            x
          </button>
        </div>

        <div className="space-y-6 p-6">
          <section className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">{appointment.patient_name}</h3>
                <p className="text-sm text-gray-500">{appointment.patient_code}</p>
                <p className="text-sm text-gray-500">{appointment.patient_phone || 'No phone recorded'}</p>
              </div>
              <AppointmentStatusBadge status={appointment.status} />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold mb-2">Dentist</h3>
              <p>{appointment.dentist_name}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold mb-2">Type</h3>
              <p className="inline-flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: appointment.type_color || '#3B82F6' }}
                />
                {appointment.type_name}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold mb-2">Duration</h3>
              <p>{appointment.duration_minutes} minutes</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold mb-2">Anesthesia</h3>
              <p>{appointment.type_requires_anesthesia ? 'Required' : 'Not required'}</p>
            </div>
          </section>

          {orthodonticCase && (
            <section className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-cyan-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Orthodontic Case</h3>
                  <p className="text-sm">{orthodonticCase.stage || 'Stage not set'}</p>
                  <p className="mt-1 text-sm">
                    Progress {orthodonticCase.progress_percent || 0}% · Latest measurements available in Orthodontics
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold uppercase">
                  {orthodonticCase.status}
                </span>
              </div>
              {orthodonticCase.clinical_notes && (
                <p className="mt-3 text-sm">{orthodonticCase.clinical_notes}</p>
              )}
            </section>
          )}

          <section>
            <h3 className="font-semibold mb-3">Complaint and Notes</h3>
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-semibold uppercase text-gray-500">Chief complaint</p>
                <p className="mt-1 text-sm text-gray-800">
                  {appointment.chief_complaint || 'No chief complaint recorded.'}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-semibold uppercase text-gray-500">Pre-appointment notes</p>
                <p className="mt-1 text-sm text-gray-800">
                  {appointment.pre_appointment_notes || 'No pre-appointment notes recorded.'}
                </p>
              </div>
              {appointment.cancellation_reason && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
                  <p className="text-xs font-semibold uppercase">Cancellation reason</p>
                  <p className="mt-1 text-sm">{appointment.cancellation_reason}</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="font-semibold mb-3">Status Workflow</h3>
            {statusError && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {statusError}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.filter(option => allowedTransitions.includes(option.value)).map(option => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.value === appointment.status}
                  onClick={() => changeStatus(option.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <textarea
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={cancellationReason}
              onChange={event => setCancellationReason(event.target.value)}
              placeholder="Cancellation reason"
            />
          </section>

          <section>
            <h3 className="font-semibold mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="rounded-lg bg-gray-800 py-2 text-white"
                onClick={() => onEdit?.(appointment)}
              >
                Edit / Reschedule
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-700 py-2 text-white"
                onClick={() => onClinical?.(appointment)}
              >
                Clinical
              </button>
              <button
                type="button"
                className="rounded-lg bg-violet-700 py-2 text-white"
                onClick={() => onBilling?.(appointment)}
              >
                Billing
              </button>
              <button
                type="button"
                className="rounded-lg border border-gray-300 py-2 text-gray-700"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </section>

          <AppointmentTimeline
            appointments={patientHistory}
            currentAppointmentId={appointment.id}
            onOpen={onEdit}
          />
        </div>
      </div>
    </div>
  )
}
