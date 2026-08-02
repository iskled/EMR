import { useEffect, useMemo, useState } from "react";
import {
  archiveReminder,
  cancelReminder,
  cancelReminderBooking,
  contactReminder,
  completeReminder,
  getReminders,
  rescheduleReminder,
  restoreReminder,
  restoreCancelledReminder,
  transitionReminder,
} from "../../services/appointments.service";

const tabs = [
  "all",
  "orthodontic",
  "overdue",
  "active",
  "contacted",
  "confirmed",
  "booked",
  "completed",
  "cancelled",
  "archived",
];
const nextOptions = [
  ["none", "No Further Recall"],
  ["30", "1 Month"],
  ["42", "6 Weeks"],
  ["90", "3 Months"],
  ["180", "6 Months"],
  ["365", "12 Months"],
  ["orthodontic", "Orthodontic Review"],
  ["custom", "Custom Date"],
];

function addDays(days) {
  const value = new Date();
  value.setDate(value.getDate() + Number(days));
  return value.toISOString().slice(0, 10);
}

export default function ReminderPanel({ onBook }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null);
  const [nextChoice, setNextChoice] = useState("none");
  const [customDate, setCustomDate] = useState("");
  const [archiving, setArchiving] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState("");
  const [contactNotes, setContactNotes] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = { ordering: "due_date" };
      if (filter === "archived") params.archived = "true";
      else if (filter === "overdue") params.overdue = "true";
      else if (filter === "orthodontic") params.recall_type = "orthodontic";
      else if (filter !== "all") params.status = filter;
      const data = await getReminders(params);
      setItems(data.results || data || []);
    } catch {
      setError("Reminders could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);
  const today = new Date().toISOString().slice(0, 10);
  const shown = useMemo(() => items, [items]);

  async function transition(reminder, status, extra = {}) {
    await transitionReminder(reminder.id, { status, ...extra });
    await load();
  }

  async function finish() {
    const payload = {};
    if (nextChoice !== "none") {
      payload.next_due_date =
        nextChoice === "custom"
          ? customDate
          : addDays(nextChoice === "orthodontic" ? 42 : nextChoice);
      payload.next_type =
        nextChoice === "orthodontic" ? "orthodontic" : completing.recall_type;
    }
    await completeReminder(completing.id, payload);
    setCompleting(null);
    setNextChoice("none");
    setCustomDate("");
    await load();
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${filter === value ? "bg-blue-700 text-white" : "border bg-white"}`}
          >
            {value === "orthodontic" ? "Orthodontic Review" : value}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="p-8">Loading reminders…</p>
      ) : error ? (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      ) : shown.length ? (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-3">Patient</th>
                <th>Reminder Type</th>
                <th>Clinical Visit Type</th>
                <th>Due Date</th>
                <th>Days Remaining</th>
                <th>Status</th>
                <th>Appointment</th>
                <th>Dentist</th>
                <th>Booked By / On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((reminder) => {
                const days = Math.ceil(
                  (new Date(reminder.due_date) - new Date(today)) / 86400000,
                );
                return (
                  <tr key={reminder.id} className="border-t align-top">
                    <td className="p-3 font-semibold">
                      <a
                        className="text-blue-700"
                        href={`/patients?patient=${reminder.patient}`}
                      >
                        {reminder.patient_name}
                      </a>
                      <div>
                        {reminder.patient_code} · {reminder.patient_phone}
                      </div>
                    </td>
                    <td>{reminder.reminder_type_label}</td>
                    <td>{reminder.clinical_visit_type || "—"}</td>
                    <td>{reminder.due_date}</td>
                    <td className={days < 0 ? "text-red-700" : ""}>
                      {days < 0 ? `${-days} overdue` : days}
                    </td>
                    <td className="capitalize">{reminder.status}</td>
                    <td>
                      {reminder.appointment_date
                        ? `${reminder.appointment_date} ${reminder.appointment_time}`
                        : "—"}
                    </td>
                    <td>
                      {reminder.appointment_dentist ||
                        reminder.treating_dentist ||
                        "—"}
                    </td>
                    <td>
                      {reminder.booked_by_name || "—"}
                      {reminder.booked_at && (
                        <div>
                          {new Date(reminder.booked_at).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {["active","contacted","confirmed","booked"].includes(reminder.status) && (
                          <button
                            onClick={() => {setDialog({type:"contact",reminder});setContactNotes("")}}
                          >
                            {reminder.status==="contacted"||reminder.status==="confirmed" ? "Contact Again" : "Contact"}
                          </button>
                        )}
                        {reminder.status === "contacted" && (
                          <button
                            onClick={() => transition(reminder, "confirmed")}
                          >
                            Confirm
                          </button>
                        )}
                        {reminder.status === "confirmed" && (
                          <button
                            onClick={() => onBook(reminder)}
                            className="font-semibold text-blue-700"
                          >
                            Book Appointment
                          </button>
                        )}
                        {["active","contacted","confirmed"].includes(reminder.status) && <>
                          <button onClick={()=>{setDialog({type:"reschedule",reminder});setReason("");setNewDate("")}}>Reschedule Reminder</button>
                          <button onClick={()=>{setDialog({type:"cancel",reminder});setReason("")}}>Cancel Reminder</button>
                        </>}
                        {reminder.status === "booked" && (
                          <>
                            <a
                              className="text-blue-700"
                              href={`/appointments?appointment=${reminder.linked_appointment}`}
                            >
                              View Appointment
                            </a>
                            <a
                              href={`/appointments?appointment=${reminder.linked_appointment}`}
                            >
                              Reschedule
                            </a>
                            <button onClick={() => setCompleting(reminder)}>
                              Complete
                            </button>
                            <button onClick={()=>{setDialog({type:"cancelBooking",reminder});setReason("")}}>
                              Cancel Booking
                            </button>
                          </>
                        )}
                        {reminder.status === "completed" && (
                          <button onClick={() => setArchiving(reminder)}>
                            Archive
                          </button>
                        )}
                        {reminder.status === "cancelled" && <>
                          <a href={`/patients?patient=${reminder.patient}`}>View History</a>
                          <button onClick={async()=>{await restoreCancelledReminder(reminder.id);await load()}}>Restore</button>
                          <button onClick={()=>setArchiving(reminder)}>Archive</button>
                        </>}
                        {filter === "archived" && <>
                          <a href={`/patients?patient=${reminder.patient}`}>View History</a>
                          <button onClick={async()=>{await restoreReminder(reminder.id);await load()}}>Restore</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl bg-white p-8">
          No reminders match this filter.
        </p>
      )}

      {completing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6">
            <h2 className="text-xl font-bold">Appointment completed.</h2>
            <p className="mt-2">Would you like to schedule another recall?</p>
            <select
              className="mt-4 w-full rounded border p-3"
              value={nextChoice}
              onChange={(event) => setNextChoice(event.target.value)}
            >
              {nextOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {nextChoice === "custom" && (
              <input
                className="mt-3 w-full rounded border p-3"
                type="date"
                min={today}
                value={customDate}
                onChange={(event) => setCustomDate(event.target.value)}
              />
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setCompleting(null)}>Cancel</button>
              <button onClick={finish}>
                {nextChoice === "none"
                  ? "Complete Without Recall"
                  : "Create Recall"}
              </button>
            </div>
          </div>
        </div>
      )}

      {archiving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6">
            <h2 className="text-xl font-bold">Archive completed reminder?</h2>
            <p className="mt-2">
              Remove this completed reminder from active lists while preserving
              history and reports.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setArchiving(null)}>Cancel</button>
              <button
                onClick={async () => {
                  await archiveReminder(archiving.id);
                  setArchiving(null);
                  await load();
                }}
              >
                Archive Reminder
              </button>
            </div>
          </div>
        </div>
      )}
      {dialog && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-6">
        <h2 className="text-xl font-bold">{dialog.type==="contact"?"Record contact":dialog.type==="reschedule"?"Reschedule Reminder":dialog.type==="cancelBooking"?"Cancel Booking":"Cancel Reminder"}</h2>
        {dialog.type==="contact"?<textarea aria-label="Contact notes" className="mt-4 w-full rounded border p-3" value={contactNotes} onChange={e=>setContactNotes(e.target.value)} placeholder="Method, outcome and notes"/>:<>
          {dialog.type==="reschedule"&&<><p className="mt-3 text-sm">Current due date: {dialog.reminder.due_date}</p><input aria-label="New due date" type="date" className="mt-3 w-full rounded border p-3" value={newDate} onChange={e=>setNewDate(e.target.value)}/></>}
          <textarea aria-label="Reason" className="mt-3 w-full rounded border p-3" required value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason (required)"/>
        </>}
        <div className="mt-4 flex justify-end gap-3"><button onClick={()=>setDialog(null)}>Cancel</button><button disabled={dialog.type!=="contact"&&!reason||dialog.type==="reschedule"&&!newDate} onClick={async()=>{
          if(dialog.type==="contact")await contactReminder(dialog.reminder.id,{method:"phone",outcome:"contacted",notes:contactNotes})
          else if(dialog.type==="reschedule")await rescheduleReminder(dialog.reminder.id,{new_due_date:newDate,reason})
          else if(dialog.type==="cancelBooking")await cancelReminderBooking(dialog.reminder.id,reason)
          else await cancelReminder(dialog.reminder.id,reason)
          setDialog(null);await load()
        }}>Save</button></div>
      </div></div>}
    </section>
  );
}
