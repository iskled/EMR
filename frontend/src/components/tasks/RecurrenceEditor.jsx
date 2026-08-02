const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500'

function Field({ label, children, error }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-gray-800">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-700">{error}</span>}
    </label>
  )
}

export default function RecurrenceEditor({ form, onChange, disabled = false, fieldErrors = {} }) {
  const update = event => onChange({ ...form, [event.target.name]: event.target.value })
  const recurrenceDisabled = disabled || form.recurrence === 'none'

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Field label="Repeat Pattern" error={fieldErrors.recurrence}>
        <select name="recurrence" value={form.recurrence} onChange={update} className={inputClass} disabled={disabled}>
          <option value="none">No recurrence</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom days</option>
        </select>
      </Field>
      <Field label="Repeat Every" error={fieldErrors.recurrence_interval}>
        <input
          name="recurrence_interval"
          type="number"
          min="1"
          value={form.recurrence_interval}
          onChange={update}
          className={inputClass}
          disabled={recurrenceDisabled}
        />
      </Field>
      <Field label="Repeat Until" error={fieldErrors.recurrence_end_date}>
        <input
          name="recurrence_end_date"
          type="date"
          value={form.recurrence_end_date}
          onChange={update}
          className={inputClass}
          disabled={recurrenceDisabled}
        />
      </Field>
    </div>
  )
}
