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
  archiveAppointment,
  deleteAppointment,
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
  const initialOrthodonticCase = searchParams.get("orthodontic_case") || "";
  const initialTypeSlug = searchParams.get("type") || "";
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [clinicianLoading, setClinicianLoading] = useState(false);
  const [clinicianError, setClinicianError] = useState("");
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
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [deletingAppointment, setDeletingAppointment] = useState(false);
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
    loadClinicians();
    loadWaitingList();
    if (searchParams.get("action") === "new")
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
      const [typesResult, patientsResult, orthoResult] = await Promise.allSettled([
        getAppointmentTypes(),
        getPatients({ page: 1 }),
        getOrthodonticCases(),
      ]);
      if (typesResult.status === "fulfilled") setAppointmentTypes(typesResult.value);
      if (patientsResult.status === "fulfilled") setPatients(patientsResult.value.results || patientsResult.value);
      if (orthoResult.status === "fulfilled") setOrthodonticCases(orthoResult.value);
      if ([typesResult, patientsResult].some(result => result.status === "rejected")) setNotice("Some appointment reference data could not be loaded. Retry the affected section.");
    } catch (loadError) {
      setNotice("Reference data could not be loaded.");
    }
  }

  async function loadClinicians() {
    try {
      setClinicianLoading(true);
      setClinicianError("");
      setDentists(await getDentists());
    } catch {
      setClinicianError("Unable to load dentists.");
    } finally {
      setClinicianLoading(false);
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

  async function handleArchiveAppointment(appointment) {
    const reason = window.prompt('Optional archive reason:')
    if (reason === null) return
    await archiveAppointment(appointment.id, reason.trim())
    setDrawerOpen(false)
    setSelectedAppointment(null)
    await refreshAll()
    setNotice('Appointment archived.')
  }

  function handleDeleteAppointment(appointment) {
    setAppointmentToDelete(appointment);
  }

  async function confirmDeleteAppointment() {
    if (!appointmentToDelete || deletingAppointment) return;

    try {
      setDeletingAppointment(true);
      await deleteAppointment(appointmentToDelete.id);
      setAppointmentToDelete(null);
      setDrawerOpen(false);
      setSelectedAppointment(null);
      await refreshAll();
      setNotice("The appointment has been permanently deleted.");
    } catch {
      setNotice("The appointment could not be deleted. Please try again.");
    } finally {
      setDeletingAppointment(false);
    }
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

      {appointmentToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-appointment-title"
            aria-describedby="delete-appointment-description"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <h2
              id="delete-appointment-title"
              className="text-xl font-bold text-gray-900"
            >
              Delete appointment?
            </h2>
            <p
              id="delete-appointment-description"
              className="mt-2 text-sm text-gray-600"
            >
              This appointment will be permanently removed. This action cannot
              be reversed.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deletingAppointment}
                onClick={() => setAppointmentToDelete(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Keep appointment
              </button>
              <button
                type="button"
                disabled={deletingAppointment}
                onClick={confirmDeleteAppointment}
                className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingAppointment ? "Deleting..." : "Delete appointment"}
              </button>
            </div>
          </div>
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
          {workspaceTab !== "waiting list" && <AppointmentToolbar
            onNew={() =>
              openNewAppointment({
                date: toDateKey(selectedDate),
                time: "08:00",
              })
            }
            onRefresh={refreshAll}
            loading={loading}
            lastUpdated={lastUpdated}
          />}

          {workspaceTab === "schedule" && <AppointmentMetrics
            appointments={selectedDayAppointments}
            dentists={dentists}
            selectedDate={filters.scheduled_date || toDateKey(selectedDate)}
          />}

          {workspaceTab !== "waiting list" && <AppointmentFilters
            filters={filters}
            dentists={dentists}
            appointmentTypes={appointmentTypes}
            onChange={handleFilterChange}
            onReset={resetFilters}
          />}

          <div className={workspaceTab === "waiting list" ? "block" : "grid grid-cols-1 gap-6"}>
            <div className="space-y-6">
              {workspaceTab === "calendar" && <AppointmentCalendar
                appointments={filteredAppointments}
                selectedDate={selectedDate}
                view={calendarView}
                onViewChange={setCalendarView}
                onDateChange={handleDateChange}
                onAppointmentClick={openAppointment}
                onSlotClick={openNewAppointment}
              />}

              {workspaceTab === "schedule" && <AppointmentTable
                appointments={filteredAppointments}
                loading={loading}
                error={error}
                onEdit={openEditAppointment}
                onDelete={handleDeleteAppointment}
                onCancel={handleCancel}
              />}
            </div>

            {workspaceTab === "waiting list" && <WaitingListPanel
              entries={waitingList}
              loading={waitingLoading}
              onSchedule={openWaitingEntry}
              onRefresh={loadWaitingList}
            />}
          </div>
        </>
      )}

      <AppointmentModal
        isOpen={modalOpen}
        appointment={editingAppointment}
        waitingEntry={waitingEntry}
        patients={patients}
        dentists={dentists}
        clinicianLoading={clinicianLoading}
        clinicianError={clinicianError}
        onRetryClinicians={loadClinicians}
        appointmentTypes={appointmentTypes}
        initialDate={slotSeed?.date || toDateKey(selectedDate)}
        initialTime={slotSeed?.time || "08:00"}
        initialPatient={slotSeed?.patient || initialPatient}
        reminderId={slotSeed?.recall || ""}
        initialAppointmentType={appointmentTypes.find(type => type.slug === initialTypeSlug)?.id || ""}
        orthodonticCaseId={initialOrthodonticCase}
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
        onArchive={handleArchiveAppointment}
        onDelete={handleDeleteAppointment}
      />
    </div>
  );
}
