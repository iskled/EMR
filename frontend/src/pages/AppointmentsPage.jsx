import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppointmentModal from "../components/appointments/AppointmentModal";
import AppointmentTable from "../components/appointments/AppointmentTable";
import AppointmentDrawer from "../components/appointments/AppointmentDrawer";
import AppointmentToolbar from "../components/appointments/AppointmentToolbar";
import AppointmentCalendar from "../components/appointments/AppointmentCalendar";
import AppointmentMetrics from "../components/appointments/AppointmentMetrics";
import AppointmentFilters from "../components/appointments/AppointmentFilters";
import WaitingListPanel from "../components/appointments/WaitingListPanel";
import ReminderPanel from "../components/appointments/ReminderPanel";
import { toDateKey } from "../components/appointments/calendarUtils";
import { getPatients } from "../services/patients.service";
import {
  getAppointment,
  getAppointments,
  getAppointmentTypes,
  getDentists,
  getWaitingList,
  updateAppointmentStatus,
  transitionReminder,
} from "../services/appointments.service";
import { getOrthodonticCases } from "../services/orthodontics.service";

const initialFilters = {
  search: "",
  dentist: "",
  appointment_type: "",
  status: "",
  scheduled_date: "",
};

function sortAppointments(appointments) {
  return [...appointments].sort((a, b) =>
    `${a.scheduled_date} ${a.start_time}`.localeCompare(
      `${b.scheduled_date} ${b.start_time}`,
    ),
  );
}

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPatient = searchParams.get("patient") || "";
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [waitingList, setWaitingList] = useState([]);
  const [orthodonticCases, setOrthodonticCases] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("week");
  const [loading, setLoading] = useState(true);
  const [waitingLoading, setWaitingLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [slotSeed, setSlotSeed] = useState(null);
  const [waitingEntry, setWaitingEntry] = useState(null);
  const [workspaceTab, setWorkspaceTab] = useState("schedule");

  const filteredAppointments = useMemo(
    () => sortAppointments(appointments),
    [appointments],
  );

  const selectedDayAppointments = useMemo(() => {
    const key = filters.scheduled_date || toDateKey(selectedDate);
    return filteredAppointments.filter((item) => item.scheduled_date === key);
  }, [filteredAppointments, filters.scheduled_date, selectedDate]);

  const patientHistory = useMemo(() => {
    if (!selectedAppointment?.patient) return [];
    return filteredAppointments.filter(
      (item) => String(item.patient) === String(selectedAppointment.patient),
    );
  }, [filteredAppointments, selectedAppointment]);

  useEffect(() => {
    loadReferenceData();
    loadWaitingList();
    if (searchParams.get("action") === "new" && initialPatient)
      openNewAppointment({ date: toDateKey(new Date()), time: "08:00" });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadAppointments();
    }, 250);

    return () => clearTimeout(timeout);
  }, [filters]);

  async function loadReferenceData() {
    try {
      const [typeData, dentistData, patientData] = await Promise.all([
        getAppointmentTypes(),
        getDentists(),
        getPatients({ page: 1 }),
      ]);
      setAppointmentTypes(typeData);
      setDentists(dentistData);
      setPatients(patientData.results || patientData);
      const orthoData = await getOrthodonticCases();
      setOrthodonticCases(orthoData);
    } catch (loadError) {
      setNotice("Reference data could not be loaded.");
    }
  }

  async function loadWaitingList() {
    try {
      setWaitingLoading(true);
      const entries = await getWaitingList({ status: "waiting" });
      setWaitingList(entries);
    } catch {
      setWaitingList([]);
    } finally {
      setWaitingLoading(false);
    }
  }

  async function loadAppointments() {
    const params = {
      ordering: "scheduled_date,start_time",
    };

    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });

    try {
      setLoading(true);
      setError("");
      const data = await getAppointments(params);
      setAppointments(data);
      setLastUpdated(new Date());
    } catch (loadError) {
      setAppointments([]);
      setError("Unable to load appointments.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    const [, , , orthoData] = await Promise.all([
      loadAppointments(),
      loadWaitingList(),
      loadReferenceData(),
      getOrthodonticCases(),
    ]);
    setOrthodonticCases(orthoData);
  }

  async function openAppointment(appointment) {
    try {
      const detail = await getAppointment(appointment.id);
      setSelectedAppointment(detail);
      setDrawerOpen(true);
    } catch {
      setSelectedAppointment(appointment);
      setDrawerOpen(true);
    }
  }

  function openNewAppointment(seed = {}) {
    setEditingAppointment(null);
    setWaitingEntry(null);
    setSlotSeed(seed);
    setModalOpen(true);
  }

  function openEditAppointment(appointment) {
    setEditingAppointment(appointment);
    setWaitingEntry(null);
    setSlotSeed({
      date: appointment.scheduled_date,
      time: appointment.start_time,
    });
    setModalOpen(true);
  }

  function openWaitingEntry(entry) {
    setEditingAppointment(null);
    setWaitingEntry(entry);
    setSlotSeed({
      date: toDateKey(selectedDate),
      time: entry.preferred_time_from || "08:00",
    });
    setModalOpen(true);
  }

  async function handleSaved(saved) {
    await refreshAll();
    setDrawerOpen(false);
    setSelectedAppointment(null);
    setEditingAppointment(null);
    setWaitingEntry(null);
    setSlotSeed(null);
  }

  async function handleStatusChange(appointment, status, payload = {}) {
    await updateAppointmentStatus(appointment.id, status, payload);
    await refreshAll();
    const updated = await getAppointment(appointment.id);
    setSelectedAppointment(updated);
    setNotice(`Appointment marked ${status.replace("_", " ")}.`);
  }

  function handleCancel(appointment) {
    openAppointment(appointment);
    setNotice(
      "Open the details drawer and enter a cancellation reason to cancel.",
    );
  }

  function handleFilterChange(nextFilters) {
    setFilters(nextFilters);
    if (nextFilters.scheduled_date) {
      const [year, month, day] = nextFilters.scheduled_date
        .split("-")
        .map(Number);
      setSelectedDate(new Date(year, month - 1, day));
    }
  }

  function resetFilters() {
    setFilters(initialFilters);
    setSelectedDate(new Date());
  }

  function handleDateChange(date) {
    setSelectedDate(date);
    setFilters((prev) => ({
      ...prev,
      scheduled_date: "",
    }));
  }

  function openClinical() {
    navigate("/orthodontics");
  }

  function openBilling() {
    navigate("/billing");
  }

  return (
    <div className="space-y-6">
      {notice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {notice}
        </div>
      )}

      <nav className="flex gap-2 rounded-xl border bg-white p-2">
        {["schedule", "calendar", "waiting list", "reminders"].map((tab) => (
          <button
            key={tab}
            onClick={() => setWorkspaceTab(tab)}
            className={`rounded-lg px-4 py-2 font-semibold capitalize ${workspaceTab === tab ? "bg-blue-700 text-white" : "text-slate-700"}`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {workspaceTab === "reminders" ? (
        <ReminderPanel
          key={lastUpdated || "reminders"}
          onBook={(reminder) =>
            openNewAppointment({
              date: toDateKey(selectedDate),
              time: "08:00",
              patient: reminder.patient,
              recall: reminder.id,
            })
          }
        />
      ) : (
        <>
          <AppointmentToolbar
            onNew={() =>
              openNewAppointment({
                date: toDateKey(selectedDate),
                time: "08:00",
              })
            }
            onRefresh={refreshAll}
            loading={loading}
            lastUpdated={lastUpdated}
          />

          <AppointmentMetrics
            appointments={selectedDayAppointments}
            dentists={dentists}
            selectedDate={filters.scheduled_date || toDateKey(selectedDate)}
          />

          <AppointmentFilters
            filters={filters}
            dentists={dentists}
            appointmentTypes={appointmentTypes}
            onChange={handleFilterChange}
            onReset={resetFilters}
          />

          <div className="grid grid-cols-1 2xl:grid-cols-[1fr_360px] gap-6">
            <div className="space-y-6">
              <AppointmentCalendar
                appointments={filteredAppointments}
                selectedDate={selectedDate}
                view={calendarView}
                onViewChange={setCalendarView}
                onDateChange={handleDateChange}
                onAppointmentClick={openAppointment}
                onSlotClick={openNewAppointment}
              />

              <AppointmentTable
                appointments={filteredAppointments}
                loading={loading}
                error={error}
                onOpen={openAppointment}
                onEdit={openEditAppointment}
                onCancel={handleCancel}
                onOpenClinical={openClinical}
                onBilling={openBilling}
              />
            </div>

            <WaitingListPanel
              entries={waitingList}
              loading={waitingLoading}
              onSchedule={openWaitingEntry}
              onRefresh={loadWaitingList}
            />
          </div>
        </>
      )}

      <AppointmentModal
        isOpen={modalOpen}
        appointment={editingAppointment}
        waitingEntry={waitingEntry}
        patients={patients}
        dentists={dentists}
        appointmentTypes={appointmentTypes}
        initialDate={slotSeed?.date || toDateKey(selectedDate)}
        initialTime={slotSeed?.time || "08:00"}
        initialPatient={slotSeed?.patient || initialPatient}
        reminderId={slotSeed?.recall || ""}
        onClose={() => {
          setModalOpen(false);
          setEditingAppointment(null);
          setWaitingEntry(null);
          setSlotSeed(null);
        }}
        onSaved={handleSaved}
      />

      <AppointmentDrawer
        open={drawerOpen}
        appointment={selectedAppointment}
        patientHistory={patientHistory}
        orthodonticCase={orthodonticCases.find(
          (item) =>
            String(item.patient) === String(selectedAppointment?.patient),
        )}
        onClose={() => setDrawerOpen(false)}
        onClinical={openClinical}
        onBilling={openBilling}
        onEdit={openEditAppointment}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
