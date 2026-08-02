import { useEffect, useState } from "react";
import { getPatientSummary } from "../../services/patients.service";
const Card = ({ title, children }) => (
  <article className="rounded-xl bg-white p-4 shadow-sm">
    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
      {title}
    </h3>
    <div className="mt-2 text-sm text-slate-800">{children}</div>
  </article>
);
export default function PatientOverview({ patient }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setError(false);
    getPatientSummary(patient.id)
      .then((x) => active && setData(x))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [patient.id]);
  if (error)
    return (
      <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">
        Patient summary unavailable.
      </div>
    );
  if (!data)
    return (
      <div className="rounded-xl bg-white p-8 text-slate-500">
        Loading patient summary…
      </div>
    );
  const v = data.last_visit,
    n = data.next_appointment;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Card title="Last visit">
        {v ? (
          <>
            {v.date} · {v.time}
            <br />
            {v.type} · {v.dentist}
            <br />
            <span className="capitalize">{v.status}</span>
          </>
        ) : (
          "No completed visits recorded."
        )}
      </Card>
      <Card title="Next appointment">
        {n ? (
          <>
            {n.date} · {n.time}
            <br />
            {n.type} · {n.dentist}
          </>
        ) : (
          "No future appointment."
        )}
      </Card>
      <Card title="Latest clinical note">
        {data.latest_note ? (
          <>
            {data.latest_note.date}
            <br />
            {data.latest_note.summary || "No summary recorded."}
            <br />
            {data.latest_note.treatment_scope === "whole_mouth"
              ? "Selected teeth: Whole mouth"
              : `Selected teeth: ${data.latest_note.selected_teeth?.join(", ") || "None"}`}
          </>
        ) : (
          "No clinical note available."
        )}
      </Card>
      <Card title="Treatment summary">
        {data.latest_note?.summary || "No treatment recorded."}
      </Card>
      <Card title="Current reminder">
        {data.recall ? (
          <>
            {data.recall.type}
            <br />
            {data.recall.due_date} ·{" "}
            <span className="capitalize">{data.recall.status}</span>
          </>
        ) : (
          "No active reminder."
        )}
      </Card>
      <Card title="Last recall completed">
        {data.last_recall_completed
          ? new Date(data.last_recall_completed).toLocaleDateString()
          : "No completed recall."}
      </Card>
      <Card title="Orthodontic status">
        {data.orthodontics
          ? `${data.orthodontics.status} · ${data.orthodontics.stage}`
          : "No orthodontic case."}
      </Card>
      <Card title="Recent images">{data.recent_images}</Card>
      <Card title="Recent documents">{data.recent_documents}</Card>
      <Card title="Open tasks">{data.open_tasks}</Card>
      <Card title="Medical alerts">
        {data.allergies.filter((a) => a.severity === "severe").length ||
          "None recorded"}
      </Card>
      <Card title="Allergies">
        {data.allergies.length
          ? data.allergies.map((a) => a.substance).join(", ")
          : "None recorded"}
      </Card>
      <Card title="Current medications">
        {data.current_medications || "None recorded"}
      </Card>
    </div>
  );
}
