import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import PatientIntakeModal from "../components/patients/PatientIntakeModal";
import PatientEditModal from "../components/patients/PatientEditModal";
import PatientTabs from "../components/patients/PatientTabs";
import PatientWorkspace from "../components/patients/PatientWorkspace";
import ClinicalPatientRail from "../components/clinical/ClinicalPatientRail";
import PatientClinicalHeader from "../components/clinical/PatientClinicalHeader";
import { getPatient, getPatients } from "../services/patients.service";
import { hasPermission } from "../permissions/permissions";
import { useAuth } from "../auth/AuthContext";

const PATIENT_TABS = [
  "overview",
  "appointments",
  "clinical",
  "orthodontics",
  "documents",
  "medical-history",
  "communications",
  "tasks",
];
export default function PatientsPage() {
  const { user } = useAuth() || {};
  const [params, setParams] = useSearchParams();
  const patientId = params.get("patient");
  const requested = params.get("tab");
  const activeTab = PATIENT_TABS.includes(requested) ? requested : "overview";
  const [patients, setPatients] = useState([]),
    [selected, setSelected] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [showCreate, setShowCreate] = useState(false),
    [showEdit, setShowEdit] = useState(false);
  const updateParams = useCallback(
    (updates) => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        Object.entries(updates).forEach(([k, v]) =>
          v ? next.set(k, v) : next.delete(k),
        );
        return next;
      });
    },
    [setParams],
  );
  const selectPatient = useCallback(
    async (patient) => {
      updateParams({ patient: patient.id });
      setSelected(patient);
      try {
        setSelected(await getPatient(patient.id));
      } catch {}
    },
    [updateParams],
  );
  const loadPatients = useCallback(async () => {
    setError("");
    try {
      const data = await getPatients({ search });
      const list = data.results || data || [];
      setPatients(list);
      const target = list.find((p) => p.id === patientId) || list[0];
      if (target && target.id !== selected?.id) await selectPatient(target);
      if (!target) setSelected(null);
    } catch {
      setError("Unable to load patients.");
    } finally {
      setLoading(false);
    }
  }, [search, patientId, selected?.id, selectPatient]);
  useEffect(() => {
    const timer = setTimeout(loadPatients, 250);
    return () => clearTimeout(timer);
  }, [loadPatients]);
  const setTab = (tab) =>
    updateParams({
      tab,
      clinical:
        tab === "clinical" ? params.get("clinical") || "overview" : null,
    });
  const canClinical = hasPermission(user, "clinical.view");
  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Patients</h1>
            <p className="text-sm text-slate-500">
              Clinical and patient workspace
            </p>
          </div>
          {hasPermission(user, "patients.write") && (
            <Button onClick={() => setShowCreate(true)}>+ New Patient</Button>
          )}
        </div>
        {selected && (
          <PatientClinicalHeader
            patient={selected}
            onEdit={() => setShowEdit(true)}
          />
        )}
        <PatientTabs
          activeTab={activeTab}
          setActiveTab={setTab}
          canViewClinical={canClinical}
        />
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]">
          <div>
            {loading ? (
              <div className="rounded-xl bg-white p-5 text-slate-500">
                Loading patients…
              </div>
            ) : error ? (
              <div
                role="alert"
                className="rounded-xl bg-red-50 p-4 text-red-700"
              >
                {error}
              </div>
            ) : patients.length ? (
              <ClinicalPatientRail
                patients={patients}
                selectedPatient={selected}
                onSelect={selectPatient}
                search={search}
                onSearch={setSearch}
              />
            ) : (
              <EmptyState title="No patients found" />
            )}
          </div>
          <main className="min-w-0">
            <PatientWorkspace
              patient={selected}
              activeTab={activeTab}
              clinicalTab={params.get("clinical") || "overview"}
              onClinicalTab={(tab) =>
                updateParams({ tab: "clinical", clinical: tab })
              }
            />
          </main>
        </div>
      </div>
      <PatientIntakeModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={async (patient) => {
          setSearch("");
          setPatients((current) => [
            patient,
            ...current.filter((item) => item.id !== patient.id),
          ]);
          await selectPatient(patient);
        }}
      />
      <PatientEditModal
        patient={selected}
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        onUpdated={loadPatients}
      />
    </>
  );
}
