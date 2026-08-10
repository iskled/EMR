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

const actionBase =
  "inline-flex items-center whitespace-nowrap text-left text-xs font-semibold leading-tight transition-colors hover:underline focus:outline-none focus:underline";
const actionStyles = {
  primary: `${actionBase} text-blue-700 hover:text-blue-900`,
  secondary: `${actionBase} text-slate-700 hover:text-slate-950`,
  success: `${actionBase} text-emerald-700 hover:text-emerald-900`,
  danger: `${actionBase} text-red-700 hover:text-red-900`,
};

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
  const [contactMethod, setContactMethod] = useState("phone");
  const [contactOutcome, setContactOutcome] = useState("contacted");
  const [notice, setNotice] = useState("");
  const [processing, setProcessing] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [activeResult, archivedResult] = await Promise.allSettled([
        getReminders({ ordering: "due_date" }),
        getReminders({ ordering: "due_date", archived: "true" }),
      ]);
      if (activeResult.status === "rejected") throw activeResult.reason;
      const activeData = activeResult.value;
      const archivedData = archivedResult.status === "fulfilled" ? archivedResult.value : [];
      setItems([
        ...(activeData.results || activeData || []),
        ...(archivedData.results || archivedData || []),
      ]);
    } catch {
      setError("Reminders could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);
  const today = new Date().toISOString().slice(0, 10);
  const matchesFilter = (reminder, selectedFilter) => {
    const archived = Boolean(reminder.archived_at);
    if (selectedFilter === "archived") return archived;
    if (archived) return false;
    if (selectedFilter === "all") return true;
    if (selectedFilter === "orthodontic") return reminder.recall_type === "orthodontic";
    if (selectedFilter === "overdue") {
      return reminder.due_date < today && !["completed", "cancelled"].includes(reminder.status);
    }
    return reminder.status === selectedFilter;
  };
  const shown = useMemo(
    () => items.filter((reminder) => matchesFilter(reminder, filter)),
    [items, filter, today],
  );
  const tabCounts = useMemo(
    () => Object.fromEntries(tabs.map((tab) => [tab, items.filter((item) => matchesFilter(item, tab)).length])),
    [items, today],
  );

  async function performAction(key, operation, successMessage) {
    if (processing) return false;
    setProcessing(key);
    setError("");
    setNotice("");
    try {
      await operation();
      await load();
      setNotice(successMessage);
      return true;
    } catch {
      setError("The reminder could not be updated. Please try again.");
      return false;
    } finally {
      setProcessing("");
    }
  }

  async function transition(reminder, status, extra = {}) {
    return performAction(
      `${reminder.id}:${status}`,
      () => transitionReminder(reminder.id, { status, ...extra }),
      `Reminder moved to ${status}.`,
    );
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
    const completed = completing;
    const saved = await performAction(
      `${completed.id}:complete`,
      () => completeReminder(completed.id, payload),
      "Reminder completed.",
    );
    if (saved) {
      setCompleting(null);
      setNextChoice("none");
      setCustomDate("");
    }
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
            {value === "orthodontic" ? "Orthodontic Review" : value} ({tabCounts[value] || 0})
          </button>
        ))}
      </div>
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{notice}</p>}
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
                <th className="min-w-[520px] px-3">Actions</th>
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
                    <td className="p-3">
                      <fieldset disabled={Boolean(processing)} className="flex min-w-max flex-nowrap items-center gap-3 disabled:opacity-60">
                        {["active","contacted","confirmed","booked"].includes(reminder.status) && (
                          <button
                            className={actionStyles.secondary}
                            onClick={() => {setDialog({type:"contact",reminder});setContactNotes("");setContactMethod("phone");setContactOutcome("contacted")}}
                          >
                            {reminder.status==="contacted"||reminder.status==="confirmed" ? "Contact Again" : "Contact"}
                          </button>
                        )}
                        {reminder.status === "contacted" && (
                          <button
                            className={actionStyles.success}
                            onClick={() => transition(reminder, "confirmed")}
                          >
                            Confirm
                          </button>
                        )}
                        {reminder.status === "confirmed" && (
                          <button
                            onClick={() => onBook(reminder)}
                            className={actionStyles.primary}
                          >
                            Book Appointment
                          </button>
                        )}
                        {["active","contacted","confirmed"].includes(reminder.status) && <>
                          <button className={actionStyles.secondary} onClick={()=>{setDialog({type:"reschedule",reminder});setReason("");setNewDate("")}}>Reschedule Reminder</button>
                          <button className={actionStyles.danger} onClick={()=>{setDialog({type:"cancel",reminder});setReason("")}}>Cancel Reminder</button>
                        </>}
                        {reminder.status === "booked" && (
                          <>
                            {reminder.linked_appointment ? <>
                              <a
                                className={actionStyles.primary}
                                href={`/appointments?appointment=${reminder.linked_appointment}`}
                              >
                                View Appointment
                              </a>
                              <a
                                className={actionStyles.secondary}
                                href={`/appointments?appointment=${reminder.linked_appointment}`}
                              >
                                Reschedule
                              </a>
                            </> : <span className="text-xs font-medium text-amber-700">Linked appointment unavailable</span>}
                            <button className={actionStyles.success} onClick={() => setCompleting(reminder)}>
                              Complete
                            </button>
                            <button className={actionStyles.danger} onClick={()=>{setDialog({type:"cancelBooking",reminder});setReason("")}}>
                              Cancel Booking
                            </button>
                          </>
                        )}
                        {reminder.status === "completed" && (
                          <button className={actionStyles.secondary} onClick={() => setArchiving(reminder)}>
                            Archive
                          </button>
                        )}
                        {reminder.status === "cancelled" && <>
                          <a className={actionStyles.primary} href={`/patients?patient=${reminder.patient}`}>View History</a>
                          <button className={actionStyles.success} onClick={()=>performAction(`${reminder.id}:restore`,()=>restoreCancelledReminder(reminder.id),"Reminder restored to active.")}>Restore</button>
                          <button className={actionStyles.secondary} onClick={()=>setArchiving(reminder)}>Archive</button>
                        </>}
                        {filter === "archived" && <>
                          <a className={actionStyles.primary} href={`/patients?patient=${reminder.patient}`}>View History</a>
                          <button className={actionStyles.success} onClick={()=>performAction(`${reminder.id}:restore`,()=>restoreReminder(reminder.id),"Reminder restored to active.")}>Restore</button>
                        </>}
                      </fieldset>
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
                disabled={Boolean(processing)}
                onClick={async () => {
                  const saved = await performAction(
                    `${archiving.id}:archive`,
                    () => archiveReminder(archiving.id),
                    "Reminder archived.",
                  );
                  if (saved) setArchiving(null);
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
        {dialog.type==="contact"?<div className="mt-4 space-y-3">
          <label className="block text-sm font-semibold">Contact method<select aria-label="Contact method" className="mt-1 w-full rounded border p-3 font-normal" value={contactMethod} onChange={e=>setContactMethod(e.target.value)}><option value="phone">Phone</option><option value="sms">SMS</option><option value="email">Email</option><option value="in_person">In person</option></select></label>
          <label className="block text-sm font-semibold">Outcome<select aria-label="Contact outcome" className="mt-1 w-full rounded border p-3 font-normal" value={contactOutcome} onChange={e=>setContactOutcome(e.target.value)}><option value="contacted">Contacted</option><option value="confirmed">Confirmed</option><option value="no_answer">No answer</option><option value="message_left">Message left</option></select></label>
          <textarea aria-label="Contact notes" className="w-full rounded border p-3" value={contactNotes} onChange={e=>setContactNotes(e.target.value)} placeholder="Contact notes"/>
        </div>:<>
          {dialog.type==="reschedule"&&<><p className="mt-3 text-sm">Current due date: {dialog.reminder.due_date}</p><input aria-label="New due date" type="date" className="mt-3 w-full rounded border p-3" value={newDate} onChange={e=>setNewDate(e.target.value)}/></>}
          <textarea aria-label="Reason" className="mt-3 w-full rounded border p-3" required value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason (required)"/>
        </>}
        <div className="mt-4 flex justify-end gap-3"><button disabled={Boolean(processing)} onClick={()=>setDialog(null)}>Cancel</button><button disabled={Boolean(processing)||(dialog.type!=="contact"&&!reason)||dialog.type==="reschedule"&&!newDate} onClick={async()=>{
          const action = dialog.type;
          const reminder = dialog.reminder;
          const saved = await performAction(`${reminder.id}:${action}`, async () => {
            if(action==="contact") await contactReminder(reminder.id,{method:contactMethod,outcome:contactOutcome,notes:contactNotes})
            else if(action==="reschedule") await rescheduleReminder(reminder.id,{new_due_date:newDate,reason})
            else if(action==="cancelBooking") await cancelReminderBooking(reminder.id,reason)
            else await cancelReminder(reminder.id,reason)
          }, action==="contact"?"Contact attempt recorded.":action==="reschedule"?"Reminder rescheduled.":"Reminder cancelled.")
          if(saved) setDialog(null)
        }}>{processing ? "Saving..." : "Save"}</button></div>
      </div></div>}
    </section>
  );
}
