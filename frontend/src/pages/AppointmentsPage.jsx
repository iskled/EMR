import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import {
  getDailyAppointments,
  updateAppointmentStatus,
} from '../services/appointments.service'
import AppointmentModal from '../components/appointments/AppointmentModal'
import AppointmentTable from '../components/appointments/AppointmentTable'
import AppointmentDrawer from '../components/appointments/AppointmentDrawer'
import AppointmentToolbar from '../components/appointments/AppointmentToolbar'
import AppointmentCalendar from '../components/appointments/AppointmentCalendar'

function MetricCard({ title, value }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p>{title}</p>
      <p className="text-3xl font-bold mt-2">
        {value}
      </p>
    </div>
  )
}

export default function AppointmentsPage() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [notice, setNotice] = useState('')

  const filteredAppointments = appointments.filter(appointment =>
    (appointment.patient_name || '')
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  useEffect(() => {
    loadAppointments()
  }, [])

  async function loadAppointments() {
    try {
      setLoading(true)
      const response = await getDailyAppointments()
      setAppointments(response.data)
    } catch (error) {
      console.error(error)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(appointment, status) {
    const payload =
      status === 'cancelled'
        ? { cancellation_reason: 'Cancelled from appointment workspace' }
        : {}

    try {
      await updateAppointmentStatus(appointment.id, status, payload)
      await loadAppointments()
      setDrawerOpen(false)
    } catch (error) {
      console.error(error)
      setNotice('Unable to update appointment status.')
    }
  }

  function openAppointment(appointment) {
    setSelectedAppointment(appointment)
    setDrawerOpen(true)
  }

  function openClinical() {
    setNotice('Clinical workspace route is not enabled yet.')
  }

  function openBilling() {
    navigate('/billing')
  }

  const completed = appointments.filter(
    appointment => appointment.status === 'completed'
  ).length

  const pending = appointments.filter(
    appointment =>
      appointment.status !== 'completed' &&
      appointment.status !== 'cancelled'
  ).length

  const scheduled = appointments.filter(
    appointment => appointment.status === 'scheduled'
  ).length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {notice && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3">
            {notice}
          </div>
        )}

        <AppointmentToolbar
          onNew={() => setModalOpen(true)}
          onRefresh={loadAppointments}
          search={search}
          setSearch={setSearch}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="Today" value={appointments.length} />
          <MetricCard title="Completed" value={completed} />
          <MetricCard title="Pending" value={pending} />
          <MetricCard title="Scheduled" value={scheduled} />
        </div>

        <AppointmentCalendar
          appointments={appointments}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onAppointmentClick={openAppointment}
        />

        <AppointmentTable
          appointments={filteredAppointments}
          loading={loading}
          onEdit={openAppointment}
          onCancel={appointment => handleStatusChange(appointment, 'cancelled')}
          onOpenClinical={openClinical}
          onBilling={openBilling}
        />

        <AppointmentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={loadAppointments}
        />

        <AppointmentDrawer
          open={drawerOpen}
          appointment={selectedAppointment}
          onClose={() => setDrawerOpen(false)}
          onClinical={openClinical}
          onBilling={openBilling}
          onStatusChange={handleStatusChange}
        />
      </div>
    </DashboardLayout>
  )
}
