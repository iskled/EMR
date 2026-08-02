export default function RecurrenceEditor({ form, onChange }) {
  const update = event => onChange({ ...form, [event.target.name]: event.target.value })

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <select name="recurrence" value={form.recurrence} onChange={update} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
        <option value="none">No recurrence</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="custom">Custom days</option>
      </select>
      <input
        name="recurrence_interval"
        type="number"
        min="1"
        value={form.recurrence_interval}
        onChange={update}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        placeholder="Interval"
      />
      <input
        name="recurrence_end_date"
        type="date"
        value={form.recurrence_end_date}
        onChange={update}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  )
}
