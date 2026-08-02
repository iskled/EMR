import { hasPermission } from "../../permissions/permissions";
import { useAuth } from "../../auth/AuthContext";

function age(dob) {
  if (!dob) return "—";
  const birth = new Date(dob);
  const now = new Date();
  return (
    now.getFullYear() -
    birth.getFullYear() -
    (now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
      ? 1
      : 0)
  );
}
export default function PatientClinicalHeader({ patient, onEdit, orthoCase }) {
  const { user } = useAuth() || {};
  const allergies = patient?.allergies || [];
  return (
    <header className="sticky top-0 z-20 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">
              {patient.first_name} {patient.last_name}
            </h2>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold">
              {patient.patient_code}
            </span>
            <span
              className={`rounded px-2 py-1 text-xs font-semibold ${patient.is_active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700"}`}
            >
              {patient.is_active ? "Active" : "Inactive"}
            </span>
            {orthoCase && (
              <span className="rounded bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                Orthodontics: {orthoCase.status}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {age(patient.date_of_birth)} years ·{" "}
            {patient.date_of_birth || "DOB unavailable"} ·{" "}
            {patient.gender || "—"} · {patient.phone_primary || "No phone"} ·{" "}
            {patient.email || "No email"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {allergies.map((a) => (
              <span
                key={a.id || a.substance}
                className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700"
              >
                Allergy: {a.substance || a.allergy_type}
              </span>
            ))}
            {!allergies.length && (
              <span className="text-xs text-slate-400">No recorded alerts</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission(user, "patients.write") && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border px-3 py-2 text-sm font-semibold"
            >
              Edit
            </button>
          )}
          <a
            href={`/appointments?action=new&patient=${patient.id}`}
            className="rounded-lg border px-3 py-2 text-sm font-semibold"
          >
            New appointment
          </a>
          {hasPermission(user, "clinical.write") && (
            <a
              href={`/patients?patient=${patient.id}&tab=clinical&clinical=note`}
              className="rounded-lg border px-3 py-2 text-sm font-semibold"
            >
              Clinical note
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
