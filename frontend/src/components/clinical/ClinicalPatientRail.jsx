export default function ClinicalPatientRail({
  patients,
  selectedPatient,
  onSelect,
  search,
  onSearch,
}) {
  return (
    <aside className="max-h-[70vh] overflow-hidden rounded-xl border bg-white">
      <div className="border-b p-3">
        <label className="sr-only" htmlFor="clinical-patient-search">
          Search patients
        </label>
        <input
          id="clinical-patient-search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search patients…"
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-2">
        {patients.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            className={`mb-1 w-full rounded-lg p-3 text-left ${selectedPatient?.id === p.id ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"}`}
          >
            <span className="block text-sm font-semibold">
              {p.first_name} {p.last_name}
            </span>
            <span className="text-xs text-slate-500">
              {p.patient_code} · {p.phone_primary}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
