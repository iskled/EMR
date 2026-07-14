import Select from '../ui/Select'

export default function RecallScheduler({
  form,
  handleChange,
  isOrtho
}) {
  const options = isOrtho
    ? [
        { value: 42, label: '6 Weeks' },
        { value: 56, label: '8 Weeks' },
        { value: 84, label: '12 Weeks' },
      ]
    : [
        { value: 180, label: '6 Months' },
        { value: 365, label: '12 Months' },
      ]

  return (
    <div className="border rounded-xl p-4 space-y-4">
      <label className="flex gap-2">
        <input
          type="checkbox"
          name="schedule_recall"
          checked={form.schedule_recall}
          onChange={handleChange}
        />
        Schedule Recall
      </label>

      {form.schedule_recall && (
        <>
          <Select
            label="Recall Type"
            name="recall_type"
            value={form.recall_type}
            onChange={handleChange}
            options={[
              {
                value: 'preventive',
                label: 'Preventive Recall'
              },
              {
                value: 'orthodontic',
                label: 'Orthodontic Review'
              },
              {
                value: 'custom',
                label: 'Custom'
              }
            ]}
          />

          <Select
            label="Recall Interval"
            name="recall_interval"
            value={form.recall_interval}
            onChange={handleChange}
            options={options}
          />
        </>
      )}
    </div>
  )
}