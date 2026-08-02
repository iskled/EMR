export default function AppointmentConflictDialog({ errors }) {
  if (!errors?.length) return null

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p className="font-semibold">Appointment could not be saved.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errors.map(error => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  )
}
